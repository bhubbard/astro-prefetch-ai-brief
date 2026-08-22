import { describe, it, expect } from 'bun:test';
import {
  extractPageContent,
  extractFromString,
  normalizeWhitespace,
  stripTagsAndEntities,
  formatCompactBrief,
  buildSummarizerContext,
} from '../src/extractor';

describe('HTML Content Extractor', () => {
  it('extracts title, meta description, and clean body text from HTML string', () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Astro 5 Architecture Deep Dive - Blog</title>
          <meta name="description" content="An in-depth look into Astro 5 content layer and islands architecture." />
        </head>
        <body>
          <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
          <main>
            <h1>Astro 5 Architecture Deep Dive</h1>
            <p>Astro 5 introduces the new Content Layer, server islands, and incredible build speed optimizations.</p>
            <p>Developers can now render zero-JS HTML by default while streaming dynamic content on demand.</p>
          </main>
          <footer><p>&copy; 2026 Astro Team. All rights reserved.</p></footer>
          <script>console.log("analytics");</script>
        </body>
      </html>
    `;

    const data = extractPageContent(sampleHtml);
    expect(data.title).toContain('Astro 5 Architecture Deep Dive');
    expect(data.description).toBe('An in-depth look into Astro 5 content layer and islands architecture.');
    expect(data.content).toContain('Astro 5 introduces the new Content Layer');
    expect(data.content).not.toContain('analytics');
    expect(data.content).not.toContain('All rights reserved');
    expect(data.content).not.toContain('Home About');
  });

  it('falls back to og:title and og:description if standard tags are missing', () => {
    const sampleHtml = `
      <html>
        <head>
          <meta property="og:title" content="OpenGraph Headline" />
          <meta property="og:description" content="OpenGraph summary description text." />
        </head>
        <body>
          <article>
            <p>Article body content detailing modern web capabilities.</p>
          </article>
        </body>
      </html>
    `;

    const data = extractFromString(sampleHtml);
    expect(data.title).toBe('OpenGraph Headline');
    expect(data.description).toBe('OpenGraph summary description text.');
    expect(data.content).toContain('Article body content detailing modern web capabilities.');
  });

  it('strips unwanted script, style, svg, and iframe tags', () => {
    const dirtyHtml = `
      <main>
        <style>.hidden { display: none; }</style>
        <p>Main visible content.</p>
        <svg><circle cx="50" cy="50" r="40" /></svg>
        <script>alert("bad");</script>
        <iframe src="https://example.com"></iframe>
        <noscript>Turn on JavaScript</noscript>
      </main>
    `;

    const data = extractFromString(dirtyHtml);
    expect(data.content).toBe('Main visible content.');
    expect(data.content).not.toContain('display: none');
    expect(data.content).not.toContain('circle');
    expect(data.content).not.toContain('alert');
  });

  it('decodes HTML entities and normalizes multi-line whitespace', () => {
    const encoded = `Hello &amp; welcome &mdash; &quot;Astro&#39;s World&quot; &lt;rock&gt; &gt; &nbsp; fast`;
    const clean = stripTagsAndEntities(encoded);
    const normalized = normalizeWhitespace(clean);
    expect(normalized).toBe("Hello & welcome — \"Astro's World\" <rock> > fast");
  });

  it('enforces ultra-compact word limits with formatCompactBrief', () => {
    const longSummary =
      'Astro 5 delivers unprecedented web performance by eliminating unused client JavaScript and streaming dynamic island components on demand with precision.';
    const brief15 = formatCompactBrief(longSummary, 15);
    const words = brief15.replace(/\.\.\.$/, '').split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(15);
    expect(brief15.endsWith('...')).toBe(true);

    const shortSummary = 'Fast, zero-JS Astro site preview.';
    const exactBrief = formatCompactBrief(shortSummary, 15);
    expect(exactBrief).toBe('Fast, zero-JS Astro site preview.');
  });

  it('generates summarizer context instructions with custom word constraints', () => {
    const context15 = buildSummarizerContext({ maxWords: 15 });
    expect(context15).toContain('at most 15 words');

    const context10 = buildSummarizerContext({ maxWords: 10 });
    expect(context10).toContain('at most 10 words');
  });
});
