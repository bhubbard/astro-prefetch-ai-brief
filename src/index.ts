import type { AstroIntegration } from 'astro';
import type { PrefetchAiBriefOptions } from './types';

export * from './types';
export * from './cache';
export * from './extractor';
export * from './client';

/**
 * Astro integration that enhances prefetch by generating predictive, ultra-compact (15-word)
 * floating previews when visitors hover over links using Chrome's Built-in AI Summarizer.
 *
 * @param options Configuration options for prefetching and AI summarization.
 * @returns Astro integration definition.
 */
export function prefetchAiBrief(options: PrefetchAiBriefOptions = {}): AstroIntegration {
  return {
    name: 'astro-prefetch-ai-brief',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        const serializedOptions = JSON.stringify(options);
        injectScript(
          'page',
          `import { initPrefetchAiBrief } from 'astro-prefetch-ai-brief/client';\ninitPrefetchAiBrief(${serializedOptions});`
        );
      },
    },
  };
}

export default prefetchAiBrief;
