import { commitToPipeline } from '@/platform/core';
import type {
  WizardStage4bWorkerRequest,
  WizardStage4bWorkerResponse,
} from '@/services/wizardStage4bRuntime';

interface WizardStage4bWorkerScope {
  onmessage: ((event: MessageEvent<WizardStage4bWorkerRequest>) => void) | null;
  postMessage(message: WizardStage4bWorkerResponse): void;
}

const workerScope = self as unknown as WizardStage4bWorkerScope;

workerScope.onmessage = (event) => {
  const request = event.data;
  try {
    const result = commitToPipeline(
      {
        selections: request.selections,
        existingVfsFiles: request.existingVfsFiles,
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
