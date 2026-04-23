import env from "@server/env";
import { InternalError } from "@server/errors";
import Logger from "@server/logging/Logger";
import fetch from "@server/utils/fetch";

export enum AIProvider {
  OpenAI = "openai",
  Anthropic = "anthropic",
}

export interface AISummaryResult {
  summary: string;
  provider: AIProvider;
  model: string;
}

export interface AIClientConfig {
  provider: AIProvider;
  apiKey: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * A reusable client for interacting with AI services.
 * API keys are only used server-side and never exposed to the frontend.
 */
export class AIClient {
  private config: AIClientConfig;

  constructor(config: AIClientConfig) {
    this.config = config;
  }

  /**
   * Generates a summary of the given text content.
   *
   * @param content The text content to summarize
   * @returns A summary result containing the generated summary
   * @throws {InternalError} If the AI service call fails
   */
  public async summarize(content: string): Promise<AISummaryResult> {
    const { provider, apiKey, endpoint, model, maxTokens, temperature } = this.config;

    Logger.info("ai", `Generating summary using ${provider}`, {
      contentLength: content.length,
      model,
    });

    try {
      let result: AISummaryResult;

      switch (provider) {
        case AIProvider.OpenAI:
          result = await this.summarizeWithOpenAI(
            content,
            apiKey,
            endpoint || "https://api.openai.com/v1",
            model || "gpt-3.5-turbo",
            maxTokens || 500,
            temperature || 0.7
          );
          break;
        case AIProvider.Anthropic:
          result = await this.summarizeWithAnthropic(
            content,
            apiKey,
            endpoint || "https://api.anthropic.com/v1",
            model || "claude-3-sonnet-20240229",
            maxTokens || 500,
            temperature || 0.7
          );
          break;
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      Logger.info("ai", `Summary generated successfully`, {
        summaryLength: result.summary.length,
      });

      return result;
    } catch (error) {
      Logger.error("ai", `Failed to generate summary`, error);
      throw new InternalError(
        error instanceof Error ? error.message : "Failed to generate summary"
      );
    }
  }

  private async summarizeWithOpenAI(
    content: string,
    apiKey: string,
    endpoint: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<AISummaryResult> {
    const systemPrompt =
      "You are a helpful assistant that summarizes documents. " +
      "Provide a concise, accurate summary of the main points in the text. " +
      "Keep the summary to 3-5 paragraphs maximum.";

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Please summarize the following text:\n\n${content}`,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      timeout: 60000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No summary returned from OpenAI API");
    }

    return {
      summary,
      provider: AIProvider.OpenAI,
      model,
    };
  }

  private async summarizeWithAnthropic(
    content: string,
    apiKey: string,
    endpoint: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<AISummaryResult> {
    const systemPrompt =
      "You are a helpful assistant that summarizes documents. " +
      "Provide a concise, accurate summary of the main points in the text. " +
      "Keep the summary to 3-5 paragraphs maximum.";

    const response = await fetch(`${endpoint}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Please summarize the following text:\n\n${content}`,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      timeout: 60000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const contentBlock = data.content?.[0];
    const summary = contentBlock?.text;

    if (!summary) {
      throw new Error("No summary returned from Anthropic API");
    }

    return {
      summary,
      provider: AIProvider.Anthropic,
      model,
    };
  }
}

/**
 * Creates an AI client from environment variables.
 *
 * @returns An AI client instance, or undefined if AI services are not configured
 */
export function createAIClient(): AIClient | undefined {
  const provider = env.AI_PROVIDER;
  const apiKey = env.AI_API_KEY;

  if (!provider || !apiKey) {
    Logger.info("ai", "AI services not configured");
    return undefined;
  }

  return new AIClient({
    provider: provider as AIProvider,
    apiKey,
    endpoint: env.AI_ENDPOINT,
    model: env.AI_MODEL,
    maxTokens: env.AI_MAX_TOKENS,
    temperature: env.AI_TEMPERATURE,
  });
}
