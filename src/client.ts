import type { AISummarizer } from './chrome-ai';
import type { CachedBrief, PrefetchAiBriefOptions } from './types';
import { LRUCache } from './cache';
import { extractPageContent, formatCompactBrief, buildSummarizerContext } from './extractor';

const DEFAULT_OPTIONS: Required<PrefetchAiBriefOptions> = {
  selector: 'a[href^="/"], a[href^="./"], a[href^="../"], a:not([target="_blank"]):not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"])',
  contentSelectors: ['main', 'article', '[role="main"]', '#content', '.content', 'body'],
  excludeSelectors: [
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
  ],
  hoverDelay: 200,
  maxWords: 15,
  cacheSize: 50,
  summarizerType: 'teaser',
  summarizerLength: 'short',
  summarizerFormat: 'plain-text',
  maxInputChars: 3000,
  showLoadingState: true,
  injectStyles: true,
  tooltipClassName: '',
  theme: 'auto',
  fallbackMode: 'meta-description',
};

export class PrefetchAiBriefClient {
  private options: Required<PrefetchAiBriefOptions>;
  private cache: LRUCache<string, CachedBrief>;
  private summarizerInstance: AISummarizer | null = null;
  private isCheckingAi: boolean = false;
  private aiAvailable: boolean = false;
  private activeHoverTimer: ReturnType<typeof setTimeout> | null = null;
  private activeAbortController: AbortController | null = null;
  private currentAnchor: HTMLAnchorElement | null = null;
  private tooltipEl: HTMLElement | null = null;
  private isInitialized: boolean = false;

  constructor(userOptions: Partial<PrefetchAiBriefOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...userOptions };
    this.cache = new LRUCache<string, CachedBrief>(this.options.cacheSize);
  }

  public async init(): Promise<void> {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    if (this.options.injectStyles) {
      this.injectDefaultStyles();
    }

    this.createTooltipElement();
    this.attachEventListeners();
    await this.initChromeAI();

    // Re-bind or handle Astro View Transitions
    document.addEventListener('astro:page-load', () => {
      this.createTooltipElement();
    });
  }

  private async initChromeAI(): Promise<void> {
    if (this.isCheckingAi) return;
    this.isCheckingAi = true;

    try {
      const aiObj = window.ai || (globalThis as any).ai;
      if (!aiObj || !aiObj.summarizer) {
        this.aiAvailable = false;
        return;
      }

      const capabilities = await aiObj.summarizer.capabilities();
      if (capabilities.available === 'no') {
        this.aiAvailable = false;
        return;
      }

      this.summarizerInstance = await aiObj.summarizer.create({
        type: this.options.summarizerType,
        format: this.options.summarizerFormat,
        length: this.options.summarizerLength,
        sharedContext: 'Ultra-compact predictive webpage preview generator on link hover',
      });
      this.aiAvailable = true;
    } catch (err) {
      console.warn('[astro-prefetch-ai-brief] Chrome Summarizer AI initialization error:', err);
      this.aiAvailable = false;
    } finally {
      this.isCheckingAi = false;
    }
  }

  private createTooltipElement(): void {
    if (document.getElementById('astro-prefetch-ai-brief-tooltip')) {
      this.tooltipEl = document.getElementById('astro-prefetch-ai-brief-tooltip');
      return;
    }

    const el = document.createElement('div');
    el.id = 'astro-prefetch-ai-brief-tooltip';
    el.className = `astro-prefetch-brief-container theme-${this.options.theme} ${this.options.tooltipClassName}`.trim();
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="astro-prefetch-brief-card">
        <div class="astro-prefetch-brief-header">
          <span class="astro-prefetch-brief-badge">
            <svg class="astro-prefetch-brief-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
            </svg>
            AI Brief
          </span>
          <span class="astro-prefetch-brief-title"></span>
        </div>
        <div class="astro-prefetch-brief-body">
          <div class="astro-prefetch-brief-skeleton">
            <span class="skeleton-line line-1"></span>
            <span class="skeleton-line line-2"></span>
          </div>
          <p class="astro-prefetch-brief-text"></p>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.tooltipEl = el;
  }

  private attachEventListeners(): void {
    // Use event delegation for high performance and dynamic link support
    document.addEventListener(
      'pointerenter',
      (e) => {
        const anchor = this.findMatchingAnchor(e.target as Element);
        if (anchor) this.handleLinkHover(anchor, e as PointerEvent);
      },
      true
    );

    document.addEventListener(
      'pointerleave',
      (e) => {
        const anchor = this.findMatchingAnchor(e.target as Element);
        if (anchor && anchor === this.currentAnchor) {
          this.handleLinkLeave();
        }
      },
      true
    );

    document.addEventListener('focusin', (e) => {
      const anchor = this.findMatchingAnchor(e.target as Element);
      if (anchor) this.handleLinkHover(anchor);
    });

    document.addEventListener('focusout', (e) => {
      const anchor = this.findMatchingAnchor(e.target as Element);
      if (anchor && anchor === this.currentAnchor) {
        this.handleLinkLeave();
      }
    });

    window.addEventListener('scroll', () => this.handleLinkLeave(), { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.handleLinkLeave();
    });
  }

  private findMatchingAnchor(target: Element | null): HTMLAnchorElement | null {
    if (!target) return null;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor || !anchor.href) return null;

    // Verify it matches user selector and is an internal or valid page link
    try {
      const isInternal =
        anchor.origin === window.location.origin ||
        anchor.getAttribute('href')?.startsWith('/') ||
        anchor.getAttribute('href')?.startsWith('./') ||
        anchor.getAttribute('href')?.startsWith('../');

      if (!isInternal) return null;
      if (anchor.hasAttribute('download') || anchor.getAttribute('rel')?.includes('external')) return null;
      if (anchor.matches(this.options.selector)) return anchor;
    } catch {
      return null;
    }
    return null;
  }

  private handleLinkHover(anchor: HTMLAnchorElement, event?: PointerEvent): void {
    if (this.currentAnchor === anchor) return;

    this.cleanupPendingRequests();
    this.currentAnchor = anchor;

    this.activeHoverTimer = setTimeout(() => {
      this.triggerBrief(anchor, event);
    }, this.options.hoverDelay);
  }

  private handleLinkLeave(): void {
    this.cleanupPendingRequests();
    this.currentAnchor = null;
    this.hideTooltip();
  }

  private cleanupPendingRequests(): void {
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
      this.activeHoverTimer = null;
    }
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }

  private async triggerBrief(anchor: HTMLAnchorElement, event?: PointerEvent): Promise<void> {
    const url = anchor.href;
    if (!url) return;

    // Check LRU Cache first
    const cached = this.cache.get(url);
    if (cached) {
      this.showTooltip(anchor, cached.title, cached.summary, false);
      return;
    }

    // If fallback is 'none' and Chrome AI is unavailable, skip
    if (!this.aiAvailable && this.options.fallbackMode === 'none') {
      return;
    }

    if (this.options.showLoadingState) {
      this.showTooltip(anchor, anchor.textContent?.trim() || 'Loading...', '', true);
    }

    this.activeAbortController = new AbortController();
    const { signal } = this.activeAbortController;

    try {
      const response = await fetch(url, {
        signal,
        headers: { 'X-Requested-With': 'Astro-Prefetch-Ai-Brief' },
      });

      if (!response.ok) {
        this.hideTooltip();
        return;
      }

      const html = await response.text();
      if (signal.aborted) return;

      const pageData = extractPageContent(html, {
        contentSelectors: this.options.contentSelectors,
        excludeSelectors: this.options.excludeSelectors,
        maxInputChars: this.options.maxInputChars,
      });

      let summaryText = '';
      let isAiGenerated = false;

      if (this.aiAvailable && this.summarizerInstance && pageData.content.length > 50) {
        try {
          const contextPrompt = buildSummarizerContext(this.options);
          const rawSummary = await this.summarizerInstance.summarize(pageData.content, {
            context: contextPrompt,
            signal,
          });
          summaryText = formatCompactBrief(rawSummary, this.options.maxWords);
          isAiGenerated = true;
        } catch (aiErr) {
          console.warn('[astro-prefetch-ai-brief] Summarization inference failed, using fallback:', aiErr);
        }
      }

      // Fallback to meta-description or extracted title if AI is absent or failed
      if (!summaryText && this.options.fallbackMode === 'meta-description') {
        summaryText = pageData.description
          ? formatCompactBrief(pageData.description, this.options.maxWords)
          : formatCompactBrief(pageData.title || pageData.content, this.options.maxWords);
      }

      if (!summaryText) {
        this.hideTooltip();
        return;
      }

      const briefResult: CachedBrief = {
        title: pageData.title || anchor.textContent?.trim() || 'Preview',
        summary: summaryText,
        url,
        isAiGenerated,
        timestamp: Date.now(),
      };

      this.cache.set(url, briefResult);

      if (this.currentAnchor === anchor && !signal.aborted) {
        this.showTooltip(anchor, briefResult.title, briefResult.summary, false);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.debug('[astro-prefetch-ai-brief] Fetch brief failed:', err);
      }
      this.hideTooltip();
    }
  }

  private showTooltip(anchor: HTMLAnchorElement, title: string, text: string, isLoading: boolean): void {
    if (!this.tooltipEl) return;

    const titleEl = this.tooltipEl.querySelector('.astro-prefetch-brief-title');
    const textEl = this.tooltipEl.querySelector('.astro-prefetch-brief-text');
    const skeletonEl = this.tooltipEl.querySelector('.astro-prefetch-brief-skeleton') as HTMLElement | null;

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    if (skeletonEl) {
      skeletonEl.style.display = isLoading ? 'flex' : 'none';
    }
    if (textEl) {
      (textEl as HTMLElement).style.display = isLoading ? 'none' : 'block';
    }

    this.positionTooltip(anchor);
    this.tooltipEl.setAttribute('aria-hidden', 'false');
    this.tooltipEl.classList.add('is-visible');
  }

  private hideTooltip(): void {
    if (!this.tooltipEl) return;
    this.tooltipEl.setAttribute('aria-hidden', 'true');
    this.tooltipEl.classList.remove('is-visible');
  }

  private positionTooltip(anchor: HTMLAnchorElement): void {
    if (!this.tooltipEl) return;

    const rect = anchor.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 280;
    const tooltipHeight = tooltipRect.height || 90;
    const padding = 12;

    // Prefer placing above anchor, fallback to below
    let top = rect.top - tooltipHeight - 8;
    if (top < padding) {
      top = rect.bottom + 8;
    }

    // Align left with anchor, clamp within viewport
    let left = rect.left;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    this.tooltipEl.style.top = `${Math.round(top + window.scrollY)}px`;
    this.tooltipEl.style.left = `${Math.round(left + window.scrollX)}px`;
  }

  private injectDefaultStyles(): void {
    if (document.getElementById('astro-prefetch-ai-brief-styles')) return;

    const style = document.createElement('style');
    style.id = 'astro-prefetch-ai-brief-styles';
    style.textContent = `
      .astro-prefetch-brief-container {
        position: absolute;
        z-index: 999999;
        pointer-events: none;
        opacity: 0;
        transform: translateY(4px) scale(0.98);
        transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        width: 290px;
        max-width: calc(100vw - 24px);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .astro-prefetch-brief-container.is-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .astro-prefetch-brief-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 10px;
        padding: 10px 14px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
        color: #1a1a1a;
      }
      .astro-prefetch-brief-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
        overflow: hidden;
      }
      .astro-prefetch-brief-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 6px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-radius: 4px;
        flex-shrink: 0;
      }
      .astro-prefetch-brief-title {
        font-size: 12px;
        font-weight: 600;
        color: #4b5563;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .astro-prefetch-brief-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.4;
        color: #1f2937;
      }
      .astro-prefetch-brief-skeleton {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 4px 0;
      }
      .skeleton-line {
        height: 10px;
        background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
        background-size: 200% 100%;
        border-radius: 4px;
        animation: brief-skeleton-shimmer 1.5s infinite ease-in-out;
      }
      .skeleton-line.line-1 { width: 100%; }
      .skeleton-line.line-2 { width: 70%; }
      @keyframes brief-skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      /* Dark Theme */
      @media (prefers-color-scheme: dark) {
        .astro-prefetch-brief-container.theme-auto .astro-prefetch-brief-card {
          background: rgba(24, 24, 27, 0.92);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.5);
          color: #f3f4f6;
        }
        .astro-prefetch-brief-container.theme-auto .astro-prefetch-brief-title {
          color: #9ca3af;
        }
        .astro-prefetch-brief-container.theme-auto .astro-prefetch-brief-text {
          color: #e5e7eb;
        }
        .astro-prefetch-brief-container.theme-auto .skeleton-line {
          background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
          background-size: 200% 100%;
        }
      }
      .astro-prefetch-brief-container.theme-dark .astro-prefetch-brief-card {
        background: rgba(24, 24, 27, 0.92);
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.5);
        color: #f3f4f6;
      }
      .astro-prefetch-brief-container.theme-dark .astro-prefetch-brief-title {
        color: #9ca3af;
      }
      .astro-prefetch-brief-container.theme-dark .astro-prefetch-brief-text {
        color: #e5e7eb;
      }
      .astro-prefetch-brief-container.theme-dark .skeleton-line {
        background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
        background-size: 200% 100%;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Initializes the client-side AI brief previewer.
 */
export function initPrefetchAiBrief(options?: Partial<PrefetchAiBriefOptions>): PrefetchAiBriefClient {
  const client = new PrefetchAiBriefClient(options);
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => client.init());
    } else {
      client.init();
    }
  }
  return client;
}
