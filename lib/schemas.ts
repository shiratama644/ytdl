import { z } from "zod";

export const videoQuerySchema = z.object({
  q: z.string().trim().min(1, "query is required"),
});

export const liveChatQuerySchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "q is required"),
});

export const channelQuerySchema = z.object({
  id: z.string().trim().min(1, "id is required"),
});
