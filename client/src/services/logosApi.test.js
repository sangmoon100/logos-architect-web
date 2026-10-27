import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let generateName;
let getTags;
let getWords;

beforeAll(async () => {
  vi.stubEnv('APP_ENV', 'dev');
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5000');
  ({ generateName, getTags, getWords } = await import('./logosApi.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Logos Architect API client', () => {
  it('loads the tag list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: ['#게헨나'] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getTags()).resolves.toEqual(['#게헨나']);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:5000/api/tags');
  });

  it('sends every selected tag as a repeated query parameter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          items: [],
          pagination: { page: 2, pageSize: 10, total: 0, totalPages: 0 },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getWords({
      tags: ['#게헨나', '#신비'],
      query: '섭리',
      page: 2,
      pageSize: 10,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:5000/api/words?tags=%23%EA%B2%8C%ED%97%A8%EB%82%98&tags=%23%EC%8B%A0%EB%B9%84&q=%EC%84%AD%EB%A6%AC&page=2&pageSize=10',
    );
  });

  it('posts the selected tags for name generation', async () => {
    const result = [
      {
        caseType: 'adjective_noun',
        mix: '광란의 프로비던스',
        translation: '광란의 섭리',
        english: 'Frantic Providence',
        pronunciation: '프랜틱 프로비던스',
      },
      {
        caseType: 'noun',
        mix: '만마전',
        translation: '만마전',
        english: 'Pandemonium',
        pronunciation: '팬더모니엄',
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: result }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateName(['#광기'])).resolves.toEqual(result);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:5000/api/names/generate',
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ tags: ['#광기'] }),
    });
  });

  it('surfaces API error messages and rejects invalid payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          error: { code: 'DATABASE_UNAVAILABLE', message: 'DB unavailable' },
        }),
      }),
    );

    await expect(getTags()).rejects.toMatchObject({
      name: 'LogosApiError',
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'DB unavailable',
    });
  });
});
