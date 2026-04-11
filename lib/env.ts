import { z } from "zod";

const envSchema = z.object({
  REDIS_URL: z.string().optional(),
  CACHE_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  CACHE_PREFIX: z.string().optional().default("ytdl"),
  CACHE_DEFAULT_TTL_SECONDS: z.coerce.number().int().positive().default(180),
  CACHE_HOME_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  CACHE_VIDEO_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  CACHE_CHANNEL_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  CACHE_SEARCH_TTL_SECONDS: z.coerce.number().int().positive().default(90),
  CACHE_LIVE_CHAT_TTL_SECONDS: z.coerce.number().int().positive().default(8),
  CACHE_STREAM_URL_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("YTDL"),
});

export const env = envSchema.parse(process.env);
