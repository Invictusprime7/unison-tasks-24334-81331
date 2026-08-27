import { runFullPreflight } from '@/services/runFullPreflight';
import type {
  FullPreflightWorkerRequest,
  FullPreflightWorkerResponse,
} from '@/services/runFullPreflightRuntime';

interface FullPreflightWorkerScope {
  onmessage: ((event: MessageEvent<FullPreflightWorkerRequest>) => void) | null;
  postMessage(message: FullPreflightWorkerResponse): void;
}

const workerScope = self as unknown as FullPreflightWorkerScope;

workerScope.onmessage = (event) => {
  const request = event.data;
  try {
    workerScope.postMessage({
      requestId: request.requestId,
      ok: true,
      result: runFullPreflight(request.files, request.options),
    });
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
