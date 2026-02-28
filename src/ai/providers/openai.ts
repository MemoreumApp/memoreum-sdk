import {
  BaseAIProvider,
  AIProviderError,
  type Message,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
} from '../base.js';
import type { AIProvider } from '../../types/index.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIResponse {
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

export class OpenAIProvider extends BaseAIProvider {
  readonly providerName: AIProvider = 'openai';
  readonly supportedModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
  ];
  readonly defaultModel = 'gpt-4o-mini';

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const res = await fetch(OPENAI_API_URL, {
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
        throw new Error(`OpenAI API error: ${error}`);
      }

      const response = (await res.json()) as OpenAIResponse;
      const choice = response.choices[0];

      return {
        content: choice.message.content || '',
        model: response.model,
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
      const res = await fetch(OPENAI_API_URL, {
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
        throw new Error(`OpenAI API error: ${error}`);
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
