import {
  BaseAIProvider,
  AIProviderError,
  type Message,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
} from '../base.js';
import type { AIProvider } from '../../types/index.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: {
    type: string;
    text: string;
  }[];
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider extends BaseAIProvider {
  readonly providerName: AIProvider = 'anthropic';
  readonly supportedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];
  readonly defaultModel = 'claude-3-5-sonnet-20241022';

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages.filter((m) => m.role !== 'system');

      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
          system: systemMessage?.content,
          messages: chatMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          stop_sequences: options?.stopSequences,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Anthropic API error: ${error}`);
      }

      const response = (await res.json()) as AnthropicResponse;
      const textContent = response.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');

      return {
        content: textContent,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason || 'end_turn',
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
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages.filter((m) => m.role !== 'system');

      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
          system: systemMessage?.content,
          messages: chatMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          stop_sequences: options?.stopSequences,
          stream: true,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Anthropic API error: ${error}`);
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
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                yield { content: parsed.delta?.text || '', done: false };
              } else if (parsed.type === 'message_stop') {
                yield { content: '', done: true };
              }
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
