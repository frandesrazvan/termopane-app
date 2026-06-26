import { randomUUID } from "node:crypto";
import { createConfiguredDocumentStorageProvider } from "../apps/web/src/lib/pdf/document-storage-provider";
import { isDocumentStorageError } from "../apps/web/src/lib/pdf/document-storage";

async function main() {
  const provider = createConfiguredDocumentStorageProvider();
  const storageKey = `smoke-tests/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.pdf`;
  const bytes = new TextEncoder().encode("%PDF-1.4\n% Synthetic Termopane storage smoke test\n");

  const putResult = await provider.put({
    storageKey,
    bytes,
    contentType: "application/pdf",
    metadata: {
      purpose: "storage-smoke-test",
      pii: "none",
    },
  });
  const readBytes = await provider.get(putResult.storageKey);

  if (readBytes.byteLength !== bytes.byteLength) {
    throw new Error("Storage smoke test read size did not match written size.");
  }

  await provider.delete(putResult.storageKey);
  console.info(
    `Document storage smoke test passed for provider "${putResult.provider}" with synthetic object ${putResult.storageKey}.`,
  );
}

main().catch((error: unknown) => {
  if (isDocumentStorageError(error)) {
    console.error(`Document storage smoke test failed: ${error.code} - ${error.message}`);
  } else {
    console.error("Document storage smoke test failed.");
  }
  process.exitCode = 1;
});
