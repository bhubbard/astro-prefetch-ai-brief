/**
 * TypeScript definitions for Chrome Built-in AI (Gemini Nano) Web APIs
 * Specification: https://github.com/explainers-by-googlers/prompt-api
 * Summarizer API: https://github.com/explainers-by-googlers/writing-assistance-apis
 */

export type AICapabilityAvailability = 'readily' | 'after-download' | 'no';

export type AISummarizerType = 'tl;dr' | 'key-points' | 'teaser' | 'headline';
export type AISummarizerFormat = 'plain-text' | 'markdown';
export type AISummarizerLength = 'short' | 'medium' | 'long';

export interface AISummarizerCapabilities {
  readonly available: AICapabilityAvailability;
  supportsType(type: AISummarizerType): AICapabilityAvailability;
  supportsFormat(format: AISummarizerFormat): AICapabilityAvailability;
  supportsLength(length: AISummarizerLength): AICapabilityAvailability;
}

export interface AISummarizerCreateOptions {
  signal?: AbortSignal;
  type?: AISummarizerType;
  format?: AISummarizerFormat;
  length?: AISummarizerLength;
  sharedContext?: string;
  monitor?: (monitor: AICreateMonitor) => void;
}

export interface AISummarizeOptions {
  context?: string;
  signal?: AbortSignal;
}

export interface AICreateMonitor extends EventTarget {
  ondownloadprogress: ((this: AICreateMonitor, ev: Event) => any) | null;
  addEventListener(
    type: 'downloadprogress',
    listener: (this: AICreateMonitor, ev: Event & { loaded: number; total: number }) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

export interface AISummarizer {
  readonly ready: Promise<void>;
  summarize(input: string, options?: AISummarizeOptions): Promise<string>;
  summarizeStreaming(input: string, options?: AISummarizeOptions): ReadableStream<string>;
  destroy(): void;
}

export interface AISummarizerFactory {
  capabilities(): Promise<AISummarizerCapabilities>;
  create(options?: AISummarizerCreateOptions): Promise<AISummarizer>;
}

export interface AILanguageModelCapabilities {
  readonly available: AICapabilityAvailability;
  readonly defaultTemperature?: number;
  readonly defaultTopK?: number;
  readonly maxTopK?: number;
}

export interface AILanguageModelCreateOptions {
  signal?: AbortSignal;
  temperature?: number;
  topK?: number;
  systemPrompt?: string;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  monitor?: (monitor: AICreateMonitor) => void;
}

export interface AILanguageModelPromptOptions {
  signal?: AbortSignal;
}

export interface AILanguageModel {
  readonly ready: Promise<void>;
  readonly maxTokens: number;
  readonly tokensSoFar: number;
  readonly tokensLeft: number;
  readonly topK: number;
  readonly temperature: number;
  prompt(input: string, options?: AILanguageModelPromptOptions): Promise<string>;
  promptStreaming(input: string, options?: AILanguageModelPromptOptions): ReadableStream<string>;
  countPromptTokens(input: string, options?: AILanguageModelPromptOptions): Promise<number>;
  clone(): Promise<AILanguageModel>;
  destroy(): void;
}

export interface AILanguageModelFactory {
  capabilities(): Promise<AILanguageModelCapabilities>;
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModel>;
}

export interface AIWriterCapabilities {
  readonly available: AICapabilityAvailability;
}

export interface AIWriterCreateOptions {
  sharedContext?: string;
  tone?: 'formal' | 'neutral' | 'casual';
  format?: 'plain-text' | 'markdown';
  length?: 'short' | 'medium' | 'long';
  signal?: AbortSignal;
}

export interface AIWriter {
  write(input: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
  writeStreaming(input: string, options?: { context?: string; signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}

export interface AIWriterFactory {
  capabilities(): Promise<AIWriterCapabilities>;
  create(options?: AIWriterCreateOptions): Promise<AIWriter>;
}

export interface AIRewriterCapabilities {
  readonly available: AICapabilityAvailability;
}

export interface AIRewriterCreateOptions {
  sharedContext?: string;
  tone?: 'as-is' | 'more-formal' | 'more-casual';
  format?: 'as-is' | 'plain-text' | 'markdown';
  length?: 'as-is' | 'shorter' | 'longer';
  signal?: AbortSignal;
}

export interface AIRewriter {
  rewrite(input: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
  rewriteStreaming(input: string, options?: { context?: string; signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}

export interface AIRewriterFactory {
  capabilities(): Promise<AIRewriterCapabilities>;
  create(options?: AIRewriterCreateOptions): Promise<AIRewriter>;
}

export interface AITranslatorCapabilities {
  available(options: { sourceLanguage: string; targetLanguage: string }): Promise<AICapabilityAvailability>;
}

export interface AITranslator {
  translate(input: string): Promise<string>;
  destroy(): void;
}

export interface AITranslatorFactory {
  capabilities(): Promise<AITranslatorCapabilities>;
  create(options: { sourceLanguage: string; targetLanguage: string }): Promise<AITranslator>;
}

export interface AIAssistantNamespace {
  readonly summarizer?: AISummarizerFactory;
  readonly languageModel?: AILanguageModelFactory;
  readonly writer?: AIWriterFactory;
  readonly rewriter?: AIRewriterFactory;
  readonly translator?: AITranslatorFactory;
}

declare global {
  interface Window {
    ai?: AIAssistantNamespace;
    /** Older Chrome origin trial aliases */
    AISummarizer?: AISummarizerFactory;
    AILanguageModel?: AILanguageModelFactory;
  }

  const ai: AIAssistantNamespace | undefined;
}
