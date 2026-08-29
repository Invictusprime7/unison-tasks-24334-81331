import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import type {
  StrictImportContractWorkerRequest,
  StrictImportContractWorkerResponse,
} from '@/services/strictImportContractRuntime';

interface StrictImportContractWorkerScope {
  onmessage: ((event: MessageEvent<StrictImportContractWorkerRequest>) => void) | null;
  postMessage(message: StrictImportContractWorkerResponse): void;
}

const workerScope = self as unknown as StrictImportContractWorkerScope;

workerScope.onmessage = (event) => {
  const request = event.data;
  try {
    // Always computed in strict mode: strict only changes behavior when the
    // VFS has no App.tsx, which canonical wizard sites always have — so the
    // result here is valid for both strict and non-strict callers, letting
    // the launcher's check and Preview's compile share one worker + cache.
    const files = prepareSandpackFiles(request.files, {
      entryPoint: request.entryPoint,
      themePresetId: request.themePresetId,
      strict: true,
    });
    workerScope.postMessage({ requestId: request.requestId, ok: true, files });
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
