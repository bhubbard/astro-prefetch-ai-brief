import type { ExtractedPageData, PrefetchAiBriefOptions } from './types';

const DEFAULT_CONTENT_SELECTORS = ['main', 'article', '[role="main"]', '#content', '.content', 'body'];
const DEFAULT_EXCLUDE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  '[aria-hidden="true"]',
  '.no-ai-brief',
];

export interface ExtractorOptions {
  contentSelectors?: string[];
  excludeSelectors?: string[];
  maxInputChars?: number;
}

/**
 * Extracts clean title, meta description, and primary article/main content text from HTML.
 * Works seamlessly in both browser DOM environments and standalone string parsers.
 */
export function extractPageContent(
  htmlOrDoc: string | Document,
  options: ExtractorOptions = {}
): ExtractedPageData {
  const contentSelectors = options.contentSelectors || DEFAULT_CONTENT_SELECTORS;
  const excludeSelectors = options.excludeSelectors || DEFAULT_EXCLUDE_SELECTORS;
  const maxInputChars = options.maxInputChars ?? 3000;

  if (typeof htmlOrDoc === 'string') {
    // If running in a browser with DOMParser available
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlOrDoc, 'text/html');
        return extractFromDocument(doc, contentSelectors, excludeSelectors, maxInputChars);
      } catch {
        // Fallback to regex string extraction if DOMParser fails
        return extractFromString(htmlOrDoc, maxInputChars);
      }
    }
    // Fallback for non-browser or lightweight environments
    return extractFromString(htmlOrDoc, maxInputChars);
  }

  return extractFromDocument(htmlOrDoc, contentSelectors, excludeSelectors, maxInputChars);
}

function extractFromDocument(
  doc: Document,
  contentSelectors: string[],
  excludeSelectors: string[],
  maxInputChars: number
): ExtractedPageData {
  // 1. Extract Title
  let title = doc.querySelector('title')?.textContent?.trim() || '';
  if (!title) {
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    title = ogTitle?.trim() || doc.querySelector('h1')?.textContent?.trim() || '';
  }

  // 2. Extract Description
  const metaDesc =
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    undefined;

  // 3. Clone document body / root to avoid mutating live DOM
  const clone = (doc.body || doc.documentElement).cloneNode(true) as HTMLElement;

  // 4. Remove excluded elements (noise)
  if (clone) {
    for (const selector of excludeSelectors) {
      try {
        const matches = clone.querySelectorAll(selector);
        matches.forEach((el) => el.remove());
      } catch {
        // Ignore invalid selector errors
      }
    }
  }

  // 5. Locate primary content element
  let targetElement: Element | null = null;
  for (const selector of contentSelectors) {
    try {
      const match = clone.querySelector(selector);
      if (match && (match.textContent || '').trim().length > 30) {
        targetElement = match;
        break;
      }
    } catch {
      // Continue to next selector
    }
  }

  if (!targetElement) {
    targetElement = clone;
  }

  const rawText = targetElement.textContent || '';
  const cleanContent = normalizeWhitespace(rawText).slice(0, maxInputChars);

  return {
    title: normalizeWhitespace(title),
    description: metaDesc ? normalizeWhitespace(metaDesc) : undefined,
    content: cleanContent,
  };
}

/**
 * Resilient regex-based HTML text extractor for environments without full DOM parser.
 */
export function extractFromString(html: string, maxInputChars: number = 3000): ExtractedPageData {
  // Extract Title
  const titleMatch =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
    html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
    html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let title = titleMatch ? stripTagsAndEntities(titleMatch[1]) : '';

  // Extract Meta Description
  const descMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
    html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
    html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
  const description = descMatch ? stripTagsAndEntities(descMatch[1]) : undefined;

  // Strip noise tags (scripts, styles, nav, footer, header, aside, etc.)
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ');

  // Try extracting <main> or <article> content if present
  const mainMatch =
    sanitized.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    sanitized.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    sanitized.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);

  const rawHtmlContent = mainMatch ? mainMatch[1] : sanitized;
  const text = stripTagsAndEntities(rawHtmlContent);
  const cleanContent = normalizeWhitespace(text).slice(0, maxInputChars);

  return {
    title: normalizeWhitespace(title),
    description: description ? normalizeWhitespace(description) : undefined,
    content: cleanContent,
  };
}

/**
 * Normalizes repeated whitespace, tabs, and newlines into single spaces.
 */
export function normalizeWhitespace(str: string): string {
  return str
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Strips HTML tags and decodes common HTML entities.
 */
export function stripTagsAndEntities(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
}

/**
 * Enforces an ultra-compact word count cap (e.g. 15 words) on model output.
 * Trims clean punctuation at the word boundary.
 */
export function formatCompactBrief(text: string, maxWords: number = 15): string {
  const clean = normalizeWhitespace(text);
  if (!clean) return '';

  const words = clean.split(/\s+/);
  if (words.length <= maxWords) {
    return clean;
  }

  const truncated = words.slice(0, maxWords).join(' ');
  // Clean trailing punctuation before ellipsis if necessary
  const normalized = truncated.replace(/[.,;:!?]+$/, '');
  return `${normalized}...`;
}

/**
 * Formats a prompt context instruction for the Chrome AI Summarizer.
 */
export function buildSummarizerContext(options: Partial<PrefetchAiBriefOptions> = {}): string {
  const maxWords = options.maxWords ?? 15;
  return `Generate an ultra-compact predictive preview of this webpage content in at most ${maxWords} words. Be direct, factual, and informative.`;
}
