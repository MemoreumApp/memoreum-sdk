import {
  BaseAIProvider,
  AIProviderError,
  type Message,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
} from '../base.js';
import type { AIProvider } from '../../types/index.js';

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider extends BaseAIProvider {
  readonly providerName: AIProvider = 'ollama';
  readonly supportedModels = [
    'llama3.2',
    'llama3.1',
    'llama3',
    'mistral',
    'mixtral',
    'codellama',
    'deepseek-coder',
    'phi3',
    'gemma2',
    'qwen2.5',
  ];
  readonly defaultModel = 'llama3.2';

  private baseUrl: string;

  constructor(apiKey: string, model?: string, temperature?: number, maxTokens?: number) {
    // apiKey is used as baseUrl for Ollama (e.g., "http://localhost:11434")
    super(apiKey, model, temperature, maxTokens);
    this.baseUrl = apiKey || 'http://localhost:11434';
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
            num_predict: options?.maxTokens ?? this.defaultMaxTokens,
            stop: options?.stopSequences,
          },
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaResponse;

      return {
        content: data.message.content,
        model: data.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        finishReason: 'stop',
      };
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.providerName
      );
    }
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamChunk> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
            num_predict: options?.maxTokens ?? this.defaultMaxTokens,
            stop: options?.stopSequences,
          },
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data: OllamaResponse = JSON.parse(line);
            yield {
              content: data.message?.content || '',
              done: data.done,
            };
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.providerName
      );
    }
  }
}
