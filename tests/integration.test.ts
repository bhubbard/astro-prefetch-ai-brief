import { describe, it, expect } from 'bun:test';
import { prefetchAiBrief } from '../src/index';

describe('Astro Integration Hook', () => {
  it('creates an integration with valid name and astro:config:setup hook', () => {
    const integration = prefetchAiBrief({
      hoverDelay: 250,
      maxWords: 12,
    });

    expect(integration.name).toBe('astro-prefetch-ai-brief');
    expect(integration.hooks).toBeDefined();
    expect(typeof integration.hooks['astro:config:setup']).toBe('function');
  });

  it('injects client script with serialized options', () => {
    const integration = prefetchAiBrief({
      hoverDelay: 300,
      maxWords: 15,
      theme: 'dark',
    });

    let injectedType = '';
    let injectedContent = '';

    const mockSetupHook = integration.hooks['astro:config:setup'] as any;
    mockSetupHook({
      injectScript: (type: string, content: string) => {
        injectedType = type;
        injectedContent = content;
      },
    });

    expect(injectedType).toBe('page');
    expect(injectedContent).toContain('initPrefetchAiBrief');
    expect(injectedContent).toContain('"hoverDelay":300');
    expect(injectedContent).toContain('"maxWords":15');
    expect(injectedContent).toContain('"theme":"dark"');
  });
});
