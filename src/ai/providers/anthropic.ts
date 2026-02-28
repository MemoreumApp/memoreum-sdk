import Anthropic from '@anthropic-ai/sdk';
import {
  BaseAIProvider,
  AIProviderError,
  type Message,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
} from '../base.js';
import type { AIProvider } from '../../types/index.js';

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

  private client: Anthropic;

  constructor(apiKey: string, model?: string, temperature?: number, maxTokens?: number) {
    super(apiKey, model, temperature, maxTokens);
    this.client = new Anthropic({ apiKey });
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      // Extract system message if present
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages.filter((m) => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
        system: systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        stop_sequences: options?.stopSequences,
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

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
      if (error instanceof Anthropic.APIError) {
        throw new AIProviderError(error.message, this.providerName, error.status);
      }
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

      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
        system: systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        stop_sequences: options?.stopSequences,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            yield { content: delta.text, done: false };
          }
        } else if (event.type === 'message_stop') {
          yield { content: '', done: true };
        }
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new AIProviderError(error.message, this.providerName, error.status);
      }
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.providerName
      );
    }
  }
}
