/**
 * Preview Session Types
 */

export interface FileMap {
  [path: string]: string;
}

export interface PreviewSession {
  id: string;
  projectId: string;
  status: SessionStatus;
  containerId?: string;
  containerPort?: number;
  iframeUrl: string;
  files: FileMap;
  createdAt: Date;
  lastActivityAt: Date;
  logs: string[];
  error?: string;
}

export type SessionStatus = 
  | 'pending'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

export interface StartSessionRequest {
  projectId: string;
  files: FileMap;
}

export interface StartSessionResponse {
  success: boolean;
  session?: {
    id: string;
    projectId: string;
    status: SessionStatus;
    iframeUrl: string;
    createdAt: string;
    lastActivityAt: string;
  };
  error?: string;
}

export interface PatchFileRequest {
  path: string;
  content: string;
}

export interface PatchFileResponse {
  success: boolean;
  error?: string;
}

export interface SessionLogsResponse {
  logs: string[];
  hasMore: boolean;
}

export interface SessionStatusResponse {
  id: string;
  projectId: string;
  status: SessionStatus;
  iframeUrl: string;
  createdAt: string;
  lastActivityAt: string;
  error?: string;
}
