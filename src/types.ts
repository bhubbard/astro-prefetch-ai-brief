import type { AISummarizerFormat, AISummarizerLength, AISummarizerType } from './chrome-ai';

export interface PrefetchAiBriefOptions {
  /**
   * CSS selector for links to attach preview briefings to.
   * By default, matches internal relative paths and current origin links.
   * @default 'a[href^="/"], a[href^="./"], a[href^="../"]'
   */
  selector?: string;

  /**
   * CSS selectors for identifying key page content when extracting from fetched HTML.
   * Evaluated in order of preference.
   * @default ['main', 'article', '[role="main"]', '#content', '.content', 'body']
   */
  contentSelectors?: string[];

  /**
   * CSS selectors for elements that should be stripped before summarization.
   * @default ['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript', 'iframe', 'svg', '[aria-hidden="true"]', '.no-ai-brief']
   */
  excludeSelectors?: string[];

  /**
   * Hover delay in milliseconds before triggering prefetch and AI brief generation.
   * Avoids unnecessary requests on quick mouse passes.
   * @default 200
   */
  hoverDelay?: number;

  /**
   * Maximum target word count for the predictive preview brief.
   * @default 15
   */
  maxWords?: number;

  /**
   * Maximum number of summaries to keep in the in-memory LRU cache.
   * @default 50
   */
  cacheSize?: number;

  /**
   * Summarizer format type passed to Chrome's Built-in AI Summarizer.
   * @default 'teaser'
   */
  summarizerType?: AISummarizerType;

  /**
   * Summarizer output length.
   * @default 'short'
   */
  summarizerLength?: AISummarizerLength;

  /**
   * Summarizer output format.
   * @default 'plain-text'
   */
  summarizerFormat?: AISummarizerFormat;

  /**
   * Maximum characters of extracted body text to feed into the summarizer prompt.
   * Keeps latency and token processing minimal.
   * @default 3000
   */
  maxInputChars?: number;

  /**
   * Whether to display a loading skeleton/spinner state in the tooltip while generating.
   * @default true
   */
  showLoadingState?: boolean;

  /**
   * Whether to inject default floating tooltip CSS styles. Set to false if you provide custom CSS.
   * @default true
   */
  injectStyles?: boolean;

  /**
   * Custom CSS class name to append to the brief tooltip container.
   * @default ''
   */
  tooltipClassName?: string;

  /**
   * Tooltip visual theme mode: 'auto' (respects prefers-color-scheme), 'dark', or 'light'.
   * @default 'auto'
   */
  theme?: 'auto' | 'dark' | 'light';

  /**
   * Fallback text or behavior when Chrome Built-in AI is not available.
   * If 'meta-description', falls back to the page's `<meta name="description">` or `<title>`.
   * If 'none', the tooltip simply does not show.
   * @default 'meta-description'
   */
  fallbackMode?: 'meta-description' | 'none';
}

export interface ExtractedPageData {
  title: string;
  description?: string;
  content: string;
}

export interface CachedBrief {
  title: string;
  summary: string;
  url: string;
  isAiGenerated: boolean;
  timestamp: number;
}
