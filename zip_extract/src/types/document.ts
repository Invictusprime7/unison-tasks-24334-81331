// Shared types for design/video editor

export type DocumentType = "design" | "video";

export type BlendMode = 
  | "normal" 
  | "multiply" 
  | "screen" 
  | "overlay" 
  | "darken" 
  | "lighten" 
  | "color-dodge" 
  | "color-burn" 
  | "hard-light" 
  | "soft-light" 
  | "difference" 
  | "exclusion";

export type LayerKind = "image" | "text" | "shape" | "group" | "video" | "audio";

export type TrackType = "video" | "audio" | "overlay";

export interface DesignToken {
  name: string;
  value: string;
}

export interface BrandKit {
  id: string;
  documentId: string;
  colors: DesignToken[];
  fonts: string[];
  logoUrl?: string;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export interface Fill {
  type: "solid" | "gradient" | "image";
  color?: string;
  gradient?: {
    type: "linear" | "radial";
    stops: { color: string; position: number }[];
    angle?: number;
  };
  imageUrl?: string;
}

export interface Mask {
  id: string;
  type: "rect" | "circle" | "path";
  data: any;
  inverted?: boolean;
}

export interface EffectNode {
  id: string;
  type: string;
  params: Record<string, any>;
}

export interface Layer {
  id: string;
  kind: LayerKind;
  transform: Transform;
  opacity: number;
  blend: BlendMode;
  visible: boolean;
  locked: boolean;
  masks?: Mask[];
  adjustments?: EffectNode[];
  payload: any;
  sortOrder: number;
}

export interface Page {
  id: string;
  documentId: string;
  width: number;
  height: number;
  background: Fill;
  layers: Layer[];
  sortOrder: number;
}

export interface TransformKeyframes {
  x?: { time: number; value: number }[];
  y?: { time: number; value: number }[];
  scale?: { time: number; value: number }[];
  rotate?: { time: number; value: number }[];
  opacity?: { time: number; value: number }[];
}

export interface Clip {
  id: string;
  trackId: string;
  src: string;
  in: number;  // clip in point
  out: number; // clip out point
  start: number; // timeline position
  transforms?: TransformKeyframes;
  effects?: EffectNode[];
}

export interface Track {
  id: string;
  timelineId: string;
  type: TrackType;
  clips: Clip[];
  sortOrder: number;
}

export interface Timeline {
  id: string;
  documentId: string;
  fps: number;
  duration: number;
  tracks: Track[];
}

export interface HistoryPointer {
  past: string[]; // snapshot IDs
  future: string[];
  current: string;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  userId: string;
  brand?: BrandKit;
  pages?: Page[];
  timeline?: Timeline;
  history?: HistoryPointer;
  createdAt: string;
  updatedAt: string;
}
