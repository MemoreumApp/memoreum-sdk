import {
  BaseAIProvider,
  AIProviderError,
  type Message,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
} from '../base.js';
import type { AIProvider } from '../../types/index.js';

const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';

interface TogetherResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class TogetherProvider extends BaseAIProvider {
  readonly providerName: AIProvider = 'together';
  readonly supportedModels = [
    'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    'mistralai/Mixtral-8x22B-Instruct-v0.1',
    'mistralai/Mistral-7B-Instruct-v0.3',
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
    'deepseek-ai/deepseek-llm-67b-chat',
  ];
  readonly defaultModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const res = await fetch(TOGETHER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Together API error: ${error}`);
      }

      const response = (await res.json()) as TogetherResponse;
      const choice = response.choices[0];

      return {
        content: choice.message?.content || '',
        model: response.model || this.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'stop',
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
      const res = await fetch(TOGETHER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          stream: true,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Together API error: ${error}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              const isDone = parsed.choices[0]?.finish_reason !== null;
              yield { content, done: isDone };
            } catch {
              // Skip invalid JSON
            }
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
