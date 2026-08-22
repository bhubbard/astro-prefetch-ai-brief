// src/cache.ts
class LRUCache {
  cache;
  _maxSize;
  constructor(maxSize = 50) {
    this._maxSize = Math.max(1, maxSize);
    this.cache = new Map;
  }
  get maxSize() {
    return this._maxSize;
  }
  set maxSize(value) {
    this._maxSize = Math.max(1, value);
    this.evictToSize();
  }
  get size() {
    return this.cache.size;
  }
  get(key) {
    if (!this.cache.has(key)) {
      return;
    }
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    this.evictToSize();
  }
  has(key) {
    return this.cache.has(key);
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  keys() {
    return this.cache.keys();
  }
  values() {
    return this.cache.values();
  }
  entries() {
    return this.cache.entries();
  }
  evictToSize() {
    while (this.cache.size > this._maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }
}

// src/extractor.ts
var DEFAULT_CONTENT_SELECTORS = ["main", "article", '[role="main"]', "#content", ".content", "body"];
var DEFAULT_EXCLUDE_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  '[aria-hidden="true"]',
  ".no-ai-brief"
];
function extractPageContent(htmlOrDoc, options = {}) {
  const contentSelectors = options.contentSelectors || DEFAULT_CONTENT_SELECTORS;
  const excludeSelectors = options.excludeSelectors || DEFAULT_EXCLUDE_SELECTORS;
  const maxInputChars = options.maxInputChars ?? 3000;
  if (typeof htmlOrDoc === "string") {
    if (typeof DOMParser !== "undefined") {
      try {
        const parser = new DOMParser;
        const doc = parser.parseFromString(htmlOrDoc, "text/html");
        return extractFromDocument(doc, contentSelectors, excludeSelectors, maxInputChars);
      } catch {
        return extractFromString(htmlOrDoc, maxInputChars);
      }
    }
    return extractFromString(htmlOrDoc, maxInputChars);
  }
  return extractFromDocument(htmlOrDoc, contentSelectors, excludeSelectors, maxInputChars);
}
function extractFromDocument(doc, contentSelectors, excludeSelectors, maxInputChars) {
  let title = doc.querySelector("title")?.textContent?.trim() || "";
  if (!title) {
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
    title = ogTitle?.trim() || doc.querySelector("h1")?.textContent?.trim() || "";
  }
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || undefined;
  const clone = (doc.body || doc.documentElement).cloneNode(true);
  if (clone) {
    for (const selector of excludeSelectors) {
      try {
        const matches = clone.querySelectorAll(selector);
        matches.forEach((el) => el.remove());
      } catch {}
    }
  }
  let targetElement = null;
  for (const selector of contentSelectors) {
    try {
      const match = clone.querySelector(selector);
      if (match && (match.textContent || "").trim().length > 30) {
        targetElement = match;
        break;
      }
    } catch {}
  }
  if (!targetElement) {
    targetElement = clone;
  }
  const rawText = targetElement.textContent || "";
  const cleanContent = normalizeWhitespace(rawText).slice(0, maxInputChars);
  return {
    title: normalizeWhitespace(title),
    description: metaDesc ? normalizeWhitespace(metaDesc) : undefined,
    content: cleanContent
  };
}
function extractFromString(html, maxInputChars = 3000) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) || html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let title = titleMatch ? stripTagsAndEntities(titleMatch[1]) : "";
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) || html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) || html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
  const description = descMatch ? stripTagsAndEntities(descMatch[1]) : undefined;
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ").replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ").replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ").replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ").replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ").replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ").replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ");
  const mainMatch = sanitized.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || sanitized.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) || sanitized.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const rawHtmlContent = mainMatch ? mainMatch[1] : sanitized;
  const text = stripTagsAndEntities(rawHtmlContent);
  const cleanContent = normalizeWhitespace(text).slice(0, maxInputChars);
  return {
    title: normalizeWhitespace(title),
    description: description ? normalizeWhitespace(description) : undefined,
    content: cleanContent
  };
}
function normalizeWhitespace(str) {
  return str.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}
function stripTagsAndEntities(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–");
}
function formatCompactBrief(text, maxWords = 15) {
  const clean = normalizeWhitespace(text);
  if (!clean)
    return "";
  const words = clean.split(/\s+/);
  if (words.length <= maxWords) {
    return clean;
  }
  const truncated = words.slice(0, maxWords).join(" ");
  const normalized = truncated.replace(/[.,;:!?]+$/, "");
  return `${normalized}...`;
}
function buildSummarizerContext(options = {}) {
  const maxWords = options.maxWords ?? 15;
  return `Generate an ultra-compact predictive preview of this webpage content in at most ${maxWords} words. Be direct, factual, and informative.`;
}

// src/client.ts
var DEFAULT_OPTIONS = {
  selector: 'a[href^="/"], a[href^="./"], a[href^="../"], a:not([target="_blank"]):not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"])',
  contentSelectors: ["main", "article", '[role="main"]', "#content", ".content", "body"],
  excludeSelectors: [
    "nav",
    "header",
    "footer",
    "aside",
    "script",
    "style",
    "noscript",
    "iframe",
    "svg",
    '[aria-hidden="true"]',
    ".no-ai-brief"
  ],
  hoverDelay: 200,
  maxWords: 15,
  cacheSize: 50,
  summarizerType: "teaser",
  summarizerLength: "short",
  summarizerFormat: "plain-text",
  maxInputChars: 3000,
  showLoadingState: true,
  injectStyles: true,
  tooltipClassName: "",
  theme: "auto",
  fallbackMode: "meta-description"
};

class PrefetchAiBriefClient {
  options;
  cache;
  summarizerInstance = null;
  isCheckingAi = false;
  aiAvailable = false;
  activeHoverTimer = null;
  activeAbortController = null;
  currentAnchor = null;
  tooltipEl = null;
  isInitialized = false;
  constructor(userOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...userOptions };
    this.cache = new LRUCache(this.options.cacheSize);
  }
  async init() {
    if (typeof window === "undefined" || this.isInitialized)
      return;
    this.isInitialized = true;
    if (this.options.injectStyles) {
      this.injectDefaultStyles();
    }
    this.createTooltipElement();
    this.attachEventListeners();
    await this.initChromeAI();
    document.addEventListener("astro:page-load", () => {
      this.createTooltipElement();
    });
  }
  async initChromeAI() {
    if (this.isCheckingAi)
      return;
    this.isCheckingAi = true;
    try {
      const aiObj = window.ai || globalThis.ai;
      if (!aiObj || !aiObj.summarizer) {
        this.aiAvailable = false;
        return;
      }
      const capabilities = await aiObj.summarizer.capabilities();
      if (capabilities.available === "no") {
        this.aiAvailable = false;
        return;
      }
      this.summarizerInstance = await aiObj.summarizer.create({
        type: this.options.summarizerType,
        format: this.options.summarizerFormat,
        length: this.options.summarizerLength,
        sharedContext: "Ultra-compact predictive webpage preview generator on link hover"
      });
      this.aiAvailable = true;
    } catch (err) {
      console.warn("[astro-prefetch-ai-brief] Chrome Summarizer AI initialization error:", err);
      this.aiAvailable = false;
    } finally {
      this.isCheckingAi = false;
    }
  }
  createTooltipElement() {
    if (document.getElementById("astro-prefetch-ai-brief-tooltip")) {
      this.tooltipEl = document.getElementById("astro-prefetch-ai-brief-tooltip");
      return;
    }
    const el = document.createElement("div");
    el.id = "astro-prefetch-ai-brief-tooltip";
    el.className = `astro-prefetch-brief-container theme-${this.options.theme} ${this.options.tooltipClassName}`.trim();
    el.setAttribute("role", "tooltip");
    el.setAttribute("aria-hidden", "true");
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
  attachEventListeners() {
    document.addEventListener("pointerenter", (e) => {
      const anchor = this.findMatchingAnchor(e.target);
      if (anchor)
        this.handleLinkHover(anchor, e);
    }, true);
    document.addEventListener("pointerleave", (e) => {
      const anchor = this.findMatchingAnchor(e.target);
      if (anchor && anchor === this.currentAnchor) {
        this.handleLinkLeave();
      }
    }, true);
    document.addEventListener("focusin", (e) => {
      const anchor = this.findMatchingAnchor(e.target);
      if (anchor)
        this.handleLinkHover(anchor);
    });
    document.addEventListener("focusout", (e) => {
      const anchor = this.findMatchingAnchor(e.target);
      if (anchor && anchor === this.currentAnchor) {
        this.handleLinkLeave();
      }
    });
    window.addEventListener("scroll", () => this.handleLinkLeave(), { passive: true });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape")
        this.handleLinkLeave();
    });
  }
  findMatchingAnchor(target) {
    if (!target)
      return null;
    const anchor = target.closest("a");
    if (!anchor || !anchor.href)
      return null;
    try {
      const isInternal = anchor.origin === window.location.origin || anchor.getAttribute("href")?.startsWith("/") || anchor.getAttribute("href")?.startsWith("./") || anchor.getAttribute("href")?.startsWith("../");
      if (!isInternal)
        return null;
      if (anchor.hasAttribute("download") || anchor.getAttribute("rel")?.includes("external"))
        return null;
      if (anchor.matches(this.options.selector))
        return anchor;
    } catch {
      return null;
    }
    return null;
  }
  handleLinkHover(anchor, event) {
    if (this.currentAnchor === anchor)
      return;
    this.cleanupPendingRequests();
    this.currentAnchor = anchor;
    this.activeHoverTimer = setTimeout(() => {
      this.triggerBrief(anchor, event);
    }, this.options.hoverDelay);
  }
  handleLinkLeave() {
    this.cleanupPendingRequests();
    this.currentAnchor = null;
    this.hideTooltip();
  }
  cleanupPendingRequests() {
    if (this.activeHoverTimer) {
      clearTimeout(this.activeHoverTimer);
      this.activeHoverTimer = null;
    }
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
  }
  async triggerBrief(anchor, event) {
    const url = anchor.href;
    if (!url)
      return;
    const cached = this.cache.get(url);
    if (cached) {
      this.showTooltip(anchor, cached.title, cached.summary, false);
      return;
    }
    if (!this.aiAvailable && this.options.fallbackMode === "none") {
      return;
    }
    if (this.options.showLoadingState) {
      this.showTooltip(anchor, anchor.textContent?.trim() || "Loading...", "", true);
    }
    this.activeAbortController = new AbortController;
    const { signal } = this.activeAbortController;
    try {
      const response = await fetch(url, {
        signal,
        headers: { "X-Requested-With": "Astro-Prefetch-Ai-Brief" }
      });
      if (!response.ok) {
        this.hideTooltip();
        return;
      }
      const html = await response.text();
      if (signal.aborted)
        return;
      const pageData = extractPageContent(html, {
        contentSelectors: this.options.contentSelectors,
        excludeSelectors: this.options.excludeSelectors,
        maxInputChars: this.options.maxInputChars
      });
      let summaryText = "";
      let isAiGenerated = false;
      if (this.aiAvailable && this.summarizerInstance && pageData.content.length > 50) {
        try {
          const contextPrompt = buildSummarizerContext(this.options);
          const rawSummary = await this.summarizerInstance.summarize(pageData.content, {
            context: contextPrompt,
            signal
          });
          summaryText = formatCompactBrief(rawSummary, this.options.maxWords);
          isAiGenerated = true;
        } catch (aiErr) {
          console.warn("[astro-prefetch-ai-brief] Summarization inference failed, using fallback:", aiErr);
        }
      }
      if (!summaryText && this.options.fallbackMode === "meta-description") {
        summaryText = pageData.description ? formatCompactBrief(pageData.description, this.options.maxWords) : formatCompactBrief(pageData.title || pageData.content, this.options.maxWords);
      }
      if (!summaryText) {
        this.hideTooltip();
        return;
      }
      const briefResult = {
        title: pageData.title || anchor.textContent?.trim() || "Preview",
        summary: summaryText,
        url,
        isAiGenerated,
        timestamp: Date.now()
      };
      this.cache.set(url, briefResult);
      if (this.currentAnchor === anchor && !signal.aborted) {
        this.showTooltip(anchor, briefResult.title, briefResult.summary, false);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.debug("[astro-prefetch-ai-brief] Fetch brief failed:", err);
      }
      this.hideTooltip();
    }
  }
  showTooltip(anchor, title, text, isLoading) {
    if (!this.tooltipEl)
      return;
    const titleEl = this.tooltipEl.querySelector(".astro-prefetch-brief-title");
    const textEl = this.tooltipEl.querySelector(".astro-prefetch-brief-text");
    const skeletonEl = this.tooltipEl.querySelector(".astro-prefetch-brief-skeleton");
    if (titleEl)
      titleEl.textContent = title;
    if (textEl)
      textEl.textContent = text;
    if (skeletonEl) {
      skeletonEl.style.display = isLoading ? "flex" : "none";
    }
    if (textEl) {
      textEl.style.display = isLoading ? "none" : "block";
    }
    this.positionTooltip(anchor);
    this.tooltipEl.setAttribute("aria-hidden", "false");
    this.tooltipEl.classList.add("is-visible");
  }
  hideTooltip() {
    if (!this.tooltipEl)
      return;
    this.tooltipEl.setAttribute("aria-hidden", "true");
    this.tooltipEl.classList.remove("is-visible");
  }
  positionTooltip(anchor) {
    if (!this.tooltipEl)
      return;
    const rect = anchor.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 280;
    const tooltipHeight = tooltipRect.height || 90;
    const padding = 12;
    let top = rect.top - tooltipHeight - 8;
    if (top < padding) {
      top = rect.bottom + 8;
    }
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
  injectDefaultStyles() {
    if (document.getElementById("astro-prefetch-ai-brief-styles"))
      return;
    const style = document.createElement("style");
    style.id = "astro-prefetch-ai-brief-styles";
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
function initPrefetchAiBrief(options) {
  const client = new PrefetchAiBriefClient(options);
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => client.init());
    } else {
      client.init();
    }
  }
  return client;
}
export {
  initPrefetchAiBrief,
  PrefetchAiBriefClient
};
