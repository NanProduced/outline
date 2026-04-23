import client from "~/utils/ApiClient";

/**
 * Summarizes a document by its ID.
 *
 * @param documentId The ID of the document to summarize
 * @returns A promise that resolves to the summary result
 */
export async function summarizeDocument(documentId: string): Promise<{
  summary: string;
  provider: string;
  model: string;
}> {
  const response = await client.post("/documents.summarize", {
    id: documentId,
  });
  
  return {
    summary: response.data.summary,
    provider: response.data.provider,
    model: response.data.model,
  };
}
