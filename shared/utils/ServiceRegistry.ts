/**
 * A simple service registry that allows app-level code to register services
 * that can be used by shared-level components.
 * 
 * This is useful for cases where shared components need to access
 * app-specific functionality like API clients.
 */

export interface AIService {
  /**
   * Summarizes a document by its ID.
   *
   * @param documentId The ID of the document to summarize
   * @returns A promise that resolves to the summary result
   */
  summarizeDocument(documentId: string): Promise<{
    summary: string;
    provider: string;
    model: string;
  }>;
}

type ServiceType = 'ai';

const services = new Map<ServiceType, unknown>();

/**
 * Registers a service in the registry.
 *
 * @param type The type of service to register
 * @param service The service instance
 */
export function registerService<T>(type: ServiceType, service: T): void {
  services.set(type, service);
}

/**
 * Gets a service from the registry.
 *
 * @param type The type of service to get
 * @returns The service instance, or undefined if not registered
 */
export function getService<T>(type: ServiceType): T | undefined {
  return services.get(type) as T | undefined;
}

/**
 * Gets the AI service from the registry.
 *
 * @returns The AI service instance, or undefined if not registered
 */
export function getAIService(): AIService | undefined {
  return getService<AIService>('ai');
}
