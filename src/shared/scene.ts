import { z } from "zod";

export const sceneIdValues = [
  "entry",
  "menu",
  "focus",
  "route",
  "report"
] as const;

export const sceneIdSchema = z.enum(sceneIdValues);

export type SceneId = z.infer<typeof sceneIdSchema>;
