import type { ExtractedPageData, PrefetchAiBriefOptions } from './types';
export interface ExtractorOptions {
    contentSelectors?: string[];
    excludeSelectors?: string[];
    maxInputChars?: number;
}
/**
 * Extracts clean title, meta description, and primary article/main content text from HTML.
 * Works seamlessly in both browser DOM environments and standalone string parsers.
 */
export declare function extractPageContent(htmlOrDoc: string | Document, options?: ExtractorOptions): ExtractedPageData;
/**
 * Resilient regex-based HTML text extractor for environments without full DOM parser.
 */
export declare function extractFromString(html: string, maxInputChars?: number): ExtractedPageData;
/**
 * Normalizes repeated whitespace, tabs, and newlines into single spaces.
 */
export declare function normalizeWhitespace(str: string): string;
/**
 * Strips HTML tags and decodes common HTML entities.
 */
export declare function stripTagsAndEntities(html: string): string;
/**
 * Enforces an ultra-compact word count cap (e.g. 15 words) on model output.
 * Trims clean punctuation at the word boundary.
 */
export declare function formatCompactBrief(text: string, maxWords?: number): string;
/**
 * Formats a prompt context instruction for the Chrome AI Summarizer.
 */
export declare function buildSummarizerContext(options?: Partial<PrefetchAiBriefOptions>): string;
//# sourceMappingURL=extractor.d.ts.map