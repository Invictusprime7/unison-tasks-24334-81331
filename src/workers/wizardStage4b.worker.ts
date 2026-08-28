import { commitToPipeline } from '@/platform/core';
import type {
  WizardLaneAWorkerRequest,
  WizardLaneAWorkerResponse,
} from '@/services/wizardStage4bRuntime';

interface WizardLaneAWorkerScope {
  onmessage: ((event: MessageEvent<WizardLaneAWorkerRequest>) => void) | null;
  postMessage(message: WizardLaneAWorkerResponse): void;
}

const workerScope = self as unknown as WizardLaneAWorkerScope;

workerScope.onmessage = (event) => {
  const request = event.data;
  try {
    const result = commitToPipeline(
      {
        selections: request.selections,
        existingVfsFiles: request.existingVfsFiles,
        mergeContext: request.mergeContext,
      },
      'wizard-launch',
    );
    workerScope.postMessage({ requestId: request.requestId, ok: true, result });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    workerScope.postMessage({
      requestId: request.requestId,
      ok: false,
      error: {
        name: normalized.name,
        message: normalized.message,
        stack: normalized.stack,
      },
    });
  }
};
