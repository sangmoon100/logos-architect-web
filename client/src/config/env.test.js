import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('API base URL configuration', () => {
  it('uses the same-origin base URL in production by default', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_BASE_URL', '');

    const { apiBaseUrl } = await import('./env.js');

    expect(apiBaseUrl).toBe('');
    expect(`${apiBaseUrl}/api/tags`).toBe('/api/tags');
  });

  it('uses the local server origin in development by default', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_BASE_URL', '');

    const { apiBaseUrl } = await import('./env.js');

    expect(apiBaseUrl).toBe('http://localhost:5000');
  });

  it('keeps production API requests same-origin when a base URL is configured', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.logos.example.com');

    const { apiBaseUrl } = await import('./env.js');

    expect(apiBaseUrl).toBe('');
  });

  it('uses a valid configured API origin in development', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000');

    const { apiBaseUrl } = await import('./env.js');

    expect(apiBaseUrl).toBe('http://localhost:4000');
  });
});
