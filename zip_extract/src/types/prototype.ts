export interface ProtoLink {
  fromNodeId: string;
  toFrameId: string;
  transition?: 'instant' | 'fade' | 'move-in' | 'slide';
  durationMs?: number;
}

export interface ProtoConfig {
  links: ProtoLink[];
  startFrameId?: string;
}

