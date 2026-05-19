import type { FrontendSceneRoute } from "../scenes/scene-coordinator.js";

export type AppNavigateTarget = FrontendSceneRoute;

export type AppNavigateHandler = (route: AppNavigateTarget) => void;
