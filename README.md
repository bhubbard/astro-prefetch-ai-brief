# astro-prefetch-ai-brief

[![npm version](https://img.shields.io/npm/v/astro-prefetch-ai-brief.svg?style=flat-square)](https://www.npmjs.com/package/astro-prefetch-ai-brief)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Astro 5 Ready](https://img.shields.io/badge/Astro-5.0+-BC52EE.svg?style=flat-square&logo=astro)](https://astro.build)
[![Chrome Built-in AI](https://img.shields.io/badge/Chrome_AI-Gemini_Nano-4285F4.svg?style=flat-square&logo=google-chrome)](https://developer.chrome.com/docs/ai/built-in)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

> **Next-generation prefetching for Astro.** Generates predictive, ultra-compact (15-word) floating previews when visitors hover over links using on-device Chrome Built-in AI (`window.ai.summarizer`).

---

## 🌟 Overview

Standard prefetching speeds up page navigation by downloading assets ahead of time. `astro-prefetch-ai-brief` takes this further: as visitors hover over an internal link, it fetches the target HTML, strips layout noise (`<nav>`, `<header>`, `<footer>`, scripts), and passes the core article/main body to **Chrome's on-device Gemini Nano model** (`window.ai.summarizer`).

Within milliseconds, a sleek floating preview appears next to the cursor, summarizing the destination in **15 words or fewer** before the user even clicks.

### ✨ Key Features

- **⚡ Zero-Server AI Inference**: Summaries run entirely locally on the user's device via Gemini Nano in Chrome. Zero API tokens, zero backend latency, 100% private.
- **🎯 15-Word Ultra-Compact Previews**: Enforces crisp, bite-sized previews that tell visitors whether a link is what they're looking for.
- **🧠 In-Memory LRU Caching**: Previously summarized pages are cached instantly in memory, making re-hovers instantaneous.
- **🧹 Noise-Free Content Extraction**: Automatically strips navigation menus, headers, sidebars, widgets, and scripts before inference.
- **🎨 Glassmorphism Floating UI**: Includes an accessible, theme-aware (`auto` / `dark` / `light`) floating tooltip with subtle skeleton shimmer while processing.
- **🛡️ Graceful Capability Fallbacks**: If Chrome AI is unavailable, falls back smoothly to `<meta name="description">` or page titles without throwing errors.
- **🚀 View Transitions Ready**: Built for modern Astro websites using Client Router and View Transitions.

---

## 📦 Installation

```bash
# Using bun
bun add astro-prefetch-ai-brief

# Using npm
npm install astro-prefetch-ai-brief

# Using pnpm
pnpm add astro-prefetch-ai-brief
```

---

## ⚙️ Prerequisites (Chrome Built-in AI)

This integration leverages the **Chrome Built-in Summarization API** powered by Gemini Nano. To test and use on-device AI features in Chromium:

1. Use **Google Chrome Dev / Canary** (or Chrome 131+ with AI experimental flags enabled).
2. Open `chrome://flags` and configure:
   - **Enables optimization guide on device**: `Enabled BypassPerfRequirement`
   - **Summarization API for Gemini Nano**: `Enabled`
   - **Prompt API for Gemini Nano**: `Enabled`
3. Restart Chrome.
4. Go to `chrome://components` and click **Check for update** next to **Optimization Guide On Device Model** to ensure Gemini Nano weights are downloaded (~1.5 GB).

> [!NOTE]
> When visited by users on browsers without Chrome AI enabled, `astro-prefetch-ai-brief` automatically falls back to `<meta name="description">` or page titles.

---

## 🚀 Quick Start

Add `prefetchAiBrief` to your `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import { prefetchAiBrief } from 'astro-prefetch-ai-brief';

export default defineConfig({
  prefetch: true, // Recommended: Astro built-in prefetch
  integrations: [
    prefetchAiBrief({
      hoverDelay: 200, // 200ms debounce on link hover
      maxWords: 15,    // 15-word compact preview cap
      theme: 'auto',   // Light/dark mode support
    }),
  ],
});
```

---

## 🛠️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `selector` | `string` | `'a[href^="/"], a[href^="./"], a[href^="../"]'` | CSS selector matching links to attach preview briefings to. |
| `hoverDelay` | `number` | `200` | Delay in milliseconds before triggering prefetch and AI inference. |
| `maxWords` | `number` | `15` | Target word cap for the predictive brief. |
| `cacheSize` | `number` | `50` | Maximum number of generated previews retained in the LRU cache. |
| `theme` | `'auto' \| 'dark' \| 'light'` | `'auto'` | Visual theme mode for the floating tooltip. |
| `summarizerType` | `'tl;dr' \| 'key-points' \| 'teaser' \| 'headline'` | `'teaser'` | Summarization style passed to Gemini Nano. |
| `summarizerLength` | `'short' \| 'medium' \| 'long'` | `'short'` | Output length target for the summarizer. |
| `summarizerFormat` | `'plain-text' \| 'markdown'` | `'plain-text'` | Output format for summarized text. |
| `contentSelectors` | `string[]` | `['main', 'article', '[role="main"]', '#content', '.content', 'body']` | Priority selectors for extracting primary page body. |
| `excludeSelectors` | `string[]` | `['nav', 'header', 'footer', 'aside', 'script', ...]` | Selectors for elements stripped before summarization. |
| `fallbackMode` | `'meta-description' \| 'none'` | `'meta-description'` | Fallback behavior when Chrome AI is not available. |
| `showLoadingState` | `boolean` | `true` | Show skeleton shimmer in the tooltip while generating. |
| `injectStyles` | `boolean` | `true` | Inject default glassmorphism tooltip styles. Set to `false` for custom CSS. |
| `tooltipClassName` | `string` | `''` | Custom CSS class name appended to the tooltip container. |

---

## 🎨 Custom Styling

If you prefer using Tailwind or custom CSS, set `injectStyles: false` and style `.astro-prefetch-brief-container`:

```css
/* Custom Tooltip Styling */
.astro-prefetch-brief-container {
  position: absolute;
  z-index: 50;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.astro-prefetch-brief-container.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.astro-prefetch-brief-card {
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(16px);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem;
  color: white;
}
```

---

## 🧪 Testing & Development

Run unit tests with [Bun](https://bun.sh):

```bash
# Run test suite
bun test

# Typecheck TypeScript
bun run typecheck

# Build bundle
bun run build
```

---

## 📄 License

MIT © [bhubbard](https://github.com/bhubbard)
