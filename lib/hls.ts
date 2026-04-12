import { spawn } from "node:child_process";
import { access, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { cacheGetOrSet } from "@/lib/cache";
import { env } from "@/lib/env";
import { getYoutubeClient } from "@/lib/youtube";

type HlsVariant = {
  quality: string;
  height: number;
  bandwidth: number;
};

const HLS_WORK_ROOT = "/tmp/ytdl-hls";
export const SUPPORTED_HLS_QUALITIES = ["2160p", "1440p", "1080p", "720p", "480p", "360p"] as const;
const BANDWIDTH_BY_HEIGHT: Record<number, number> = {
  2160: 22000000,
  1440: 12000000,
  1080: 8000000,
  720: 5000000,
  480: 2500000,
  360: 1200000,
};

let ffmpegChecked = false;
let ffmpegAvailable = false;
let lastCleanupAt = 0;
const generationLocks = new Map<string, Promise<string>>();
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const HLS_RETENTION_MS = 6 * ONE_HOUR_MS;
const CLEANUP_INTERVAL_MS = 10 * ONE_MINUTE_MS;

function qualityToHeight(quality: string) {
  const match = quality.match(/^(\d+)p$/);
  return match ? Number(match[1]) : 0;
}

function getVariantDirectory(videoId: string, quality: string) {
  return path.join(HLS_WORK_ROOT, videoId, quality);
}

function getPlaylistPath(videoId: string, quality: string) {
  return path.join(getVariantDirectory(videoId, quality), "index.m3u8");
}

export function isSupportedHlsQuality(quality: string): quality is (typeof SUPPORTED_HLS_QUALITIES)[number] {
  return SUPPORTED_HLS_QUALITIES.includes(quality as (typeof SUPPORTED_HLS_QUALITIES)[number]);
}

export function getSegmentPath(videoId: string, quality: string, file: string) {
  if (!/^[a-zA-Z0-9._-]+$/.test(file) || file.includes("..")) {
    throw new Error("invalid segment file");
  }
  return path.join(getVariantDirectory(videoId, quality), file);
}

async function ensureFfmpeg() {
  if (ffmpegChecked) {
    if (!ffmpegAvailable) throw new Error("ffmpeg is not available");
    return;
  }

  ffmpegChecked = true;
  ffmpegAvailable = await new Promise<boolean>((resolve) => {
    const process = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    process.once("error", () => resolve(false));
    process.once("exit", (code) => resolve(code === 0));
  });

  if (!ffmpegAvailable) throw new Error("ffmpeg is not available");
}

async function resolveVariantVideoUrl(videoId: string, quality: string) {
  const yt = await getYoutubeClient();
  const format = await yt.getStreamingData(videoId, {
    type: "video",
    quality,
    format: "mp4",
  });
  return format.url ?? (await format.decipher());
}

async function resolveAudioUrl(videoId: string) {
  const yt = await getYoutubeClient();
  const format = await yt.getStreamingData(videoId, {
    type: "audio",
    quality: "best",
    format: "mp4",
  });
  return format.url ?? (await format.decipher());
}

export async function getAvailableHlsVariants(videoId: string): Promise<HlsVariant[]> {
  return cacheGetOrSet(
    `hls:variants:${videoId}`,
    async () => {
      const discovered = await Promise.all(
        SUPPORTED_HLS_QUALITIES.map(async (quality) => {
          try {
            const url = await resolveVariantVideoUrl(videoId, quality);
            if (!url) return null;
            const height = qualityToHeight(quality);
            if (!height) return null;
            return {
              quality,
              height,
              bandwidth: BANDWIDTH_BY_HEIGHT[height] ?? 3500000,
            } as HlsVariant;
          } catch {
            return null;
          }
        }),
      );

      return discovered.filter((item): item is HlsVariant => Boolean(item));
    },
    env.CACHE_STREAM_URL_TTL_SECONDS,
  );
}

async function cleanupOldHlsArtifacts() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  try {
    const videoDirs = await readdir(HLS_WORK_ROOT, { withFileTypes: true });
    await Promise.all(
      videoDirs
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const videoDirPath = path.join(HLS_WORK_ROOT, entry.name);
          const qualityDirs = await readdir(videoDirPath, { withFileTypes: true }).catch(() => []);
          await Promise.all(
            qualityDirs
              .filter((qualityEntry) => qualityEntry.isDirectory())
              .map(async (qualityEntry) => {
                const qualityDirPath = path.join(videoDirPath, qualityEntry.name);
                const playlistPath = path.join(qualityDirPath, "index.m3u8");
                const info = await stat(playlistPath).catch(() => null);
                const stale = !info || now - info.mtimeMs > HLS_RETENTION_MS;
                if (stale) {
                  await rm(qualityDirPath, { recursive: true, force: true });
                }
              }),
          );
        }),
    );
  } catch {
    // ignore cleanup failures
  }
}

async function runFfmpeg(videoUrl: string, audioUrl: string, outputDir: string, playlistPath: string) {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    videoUrl,
    "-i",
    audioUrl,
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-f",
    "hls",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    path.join(outputDir, "seg_%05d.ts"),
    playlistPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let errorBuffer = "";
    process.stderr.on("data", (chunk) => {
      errorBuffer += String(chunk);
    });
    process.once("error", reject);
    process.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(errorBuffer || `ffmpeg exited with code ${code}`));
      }
    });
  });
}

export async function ensureHlsVariantPrepared(videoId: string, quality: string) {
  if (!isSupportedHlsQuality(quality)) {
    throw new Error("unsupported quality");
  }

  const lockKey = `${videoId}:${quality}`;
  const active = generationLocks.get(lockKey);
  if (active) return active;

  const task = (async () => {
    await cleanupOldHlsArtifacts();
    await ensureFfmpeg();
    const outputDir = getVariantDirectory(videoId, quality);
    const playlistPath = getPlaylistPath(videoId, quality);

    try {
      await access(playlistPath, fsConstants.R_OK);
      const playlistStat = await stat(playlistPath);
      if (playlistStat.size > 0) return playlistPath;
    } catch {
      // continue
    }

    await mkdir(outputDir, { recursive: true });
    const [videoUrl, audioUrl] = await Promise.all([
      resolveVariantVideoUrl(videoId, quality),
      resolveAudioUrl(videoId),
    ]);

    await runFfmpeg(videoUrl, audioUrl, outputDir, playlistPath);
    return playlistPath;
  })().finally(() => {
    generationLocks.delete(lockKey);
  });

  generationLocks.set(lockKey, task);
  return task;
}

export async function getRewrittenMediaPlaylist(
  videoId: string,
  quality: string,
  origin: string,
) {
  const playlistPath = await ensureHlsVariantPrepared(videoId, quality);
  const raw = await readFile(playlistPath, "utf-8");

  return raw
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return `${origin}/api/hls/segment?id=${encodeURIComponent(videoId)}&quality=${encodeURIComponent(quality)}&file=${encodeURIComponent(trimmed)}`;
    })
    .join("\n");
}
