import { OpenRouter } from '@openrouter/sdk';
import dotenv from 'dotenv';

// Automatically load environment variables from .env.local and .env if running in Node/TSX environment
if (typeof process !== 'undefined' && process.env) {
  try {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
  } catch {
    // Ignore in browser environment
  }
}

/**
 * Retrieves the OpenRouter API Key from environment variables.
 * Throws a descriptive error with a link to create an API key if not set.
 */
export function getOpenRouterApiKey(): string {
  const apiKey =
    typeof process !== 'undefined' && process.env
      ? process.env.OPENROUTER_API_KEY
      : undefined;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Please create an API key at https://openrouter.ai/keys and add it to your environment or .env.local file (OPENROUTER_API_KEY=your_key_here).'
    );
  }

  return apiKey.trim();
}

/**
 * Instantiates the official OpenRouter client SDK with proper headers and configuration.
 */
export function getOpenRouterClient(customApiKey?: string): OpenRouter {
  const apiKey = customApiKey || getOpenRouterApiKey();

  return new OpenRouter({
    apiKey,
    httpReferer: 'https://nexa15.local',
    appTitle: 'NEXA15 Attendance & Management System',
  });
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SendMessageOptions {
  model?: string; // Model slug (e.g., 'anthropic/claude-opus-5.5', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini')
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

/**
 * Sends a non-streaming chat completion request through OpenRouter.
 */
export async function sendOpenRouterChat(options: SendMessageOptions): Promise<{
  content: string;
  model: string;
  id: string;
}> {
  const {
    model = 'anthropic/claude-3.5-sonnet',
    messages,
    temperature,
    maxTokens,
    apiKey,
  } = options;

  const client = getOpenRouterClient(apiKey);

  try {
    const response = await client.chat.send({
      chatRequest: {
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        maxTokens,
        stream: false,
      },
    });

    const firstChoice = (response as any).choices?.[0];
    const replyContent = firstChoice?.message?.content;

    if (typeof replyContent === 'string') {
      return {
        content: replyContent,
        model: (response as any).model || model,
        id: (response as any).id || '',
      };
    }

    if (Array.isArray(replyContent)) {
      const textParts = replyContent
        .map((p: any) => (typeof p === 'string' ? p : p?.text || ''))
        .join('');
      return {
        content: textParts,
        model: (response as any).model || model,
        id: (response as any).id || '',
      };
    }

    return {
      content: String(replyContent ?? ''),
      model: (response as any).model || model,
      id: (response as any).id || '',
    };
  } catch (error: any) {
    // Specific error classification for OpenRouter responses
    if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('auth')) {
      throw new Error(
        `OpenRouter Authentication Error (401): Invalid API Key. Please verify your OPENROUTER_API_KEY from https://openrouter.ai/keys. Details: ${error.message}`
      );
    }
    if (error?.status === 402 || error?.message?.includes('402') || error?.message?.includes('credits')) {
      throw new Error(
        `OpenRouter Payment/Credits Error (402): Insufficient balance or credits. Check your account at https://openrouter.ai/credits. Details: ${error.message}`
      );
    }
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('rate limit')) {
      throw new Error(
        `OpenRouter Rate Limit Exceeded (429): Please wait before trying again. Details: ${error.message}`
      );
    }
    throw new Error(`OpenRouter Request Failed: ${error?.message || error}`);
  }
}

/**
 * Sends a streaming chat completion request through OpenRouter.
 */
export async function* streamOpenRouterChat(options: SendMessageOptions): AsyncGenerator<string, void, unknown> {
  const {
    model = 'anthropic/claude-3.5-sonnet',
    messages,
    temperature,
    maxTokens,
    apiKey,
  } = options;

  const client = getOpenRouterClient(apiKey);

  try {
    const stream = await client.chat.send({
      chatRequest: {
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature,
        maxTokens,
        stream: true,
      },
    });

    for await (const chunk of stream as any) {
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  } catch (error: any) {
    if (error?.status === 401 || error?.message?.includes('401')) {
      throw new Error(
        `OpenRouter Authentication Error (401): Invalid API Key. Create or verify your key at https://openrouter.ai/keys.`
      );
    }
    throw new Error(`OpenRouter Stream Failed: ${error?.message || error}`);
  }
}
