import { spawn } from "node:child_process";
import { access, mkdir, readFile, stat } from "node:fs/promises";
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
const QUALITY_CANDIDATES = ["2160p", "1440p", "1080p", "720p", "480p", "360p"] as const;
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
        QUALITY_CANDIDATES.map(async (quality) => {
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
