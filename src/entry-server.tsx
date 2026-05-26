import { renderToReadableStream } from 'react-dom/server';
import App from './App';
import { IdentityProvider } from './lib/IdentityContext';

/**
 * Server-side render function — renders the full React tree to an HTML string.
 * Uses renderToReadableStream for proper Suspense/lazy-component support.
 *
 * Compatible with both:
 *  - Cloudflare Workers (Web Streams API)
 *  - Node.js 18+ (via tsx, which supports Web Streams)
 */
export async function render(): Promise<string> {
  const stream = await renderToReadableStream(
    <IdentityProvider>
      <App />
    </IdentityProvider>
  );

  // Wait for all Suspense boundaries (lazy components) to resolve
  await stream.allReady;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }
  // Flush remaining bytes
  chunks.push(decoder.decode());

  return chunks.join('');
}
