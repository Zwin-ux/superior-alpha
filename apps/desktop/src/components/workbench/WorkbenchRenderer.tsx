import { SpriteClayWorkbenchStage } from "./SpriteClayWorkbenchStage";
import type { BotIdentity, SuperiorBotReaction } from "@clawdbot/shared";
import type { DragEvent, ReactElement } from "react";
import type { AssemblyDropState, AssemblySlotTarget, WorkshopCameraMode } from "../../assembly";

export interface WorkbenchRendererProps {
  bot: BotIdentity;
  cameraMode: WorkshopCameraMode;
  activeTarget: AssemblySlotTarget | null;
  dropState: AssemblyDropState;
  snapKey: number;
  functionReaction: SuperiorBotReaction | null;
  onAssemblyDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onAssemblyDragLeave: () => void;
  onAssemblyDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function WorkbenchRenderer(props: WorkbenchRendererProps): ReactElement {
  return <SpriteClayWorkbenchStage {...props} />;
}
