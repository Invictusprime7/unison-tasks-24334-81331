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
    // Result is discarded — this call exists purely for its throw-on-violation
    // side effect (unresolved JSX imports, missing strict entry point).
    prepareSandpackFiles(request.files, {
      entryPoint: request.entryPoint,
      themePresetId: request.themePresetId,
      strict: true,
    });
    workerScope.postMessage({ requestId: request.requestId, ok: true });
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
