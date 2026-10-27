import { apiBaseUrl } from '../config/env.js';

export class LogosApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'LogosApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestData(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, options);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    throw new Error('서버에 연결할 수 없습니다. API 주소와 네트워크를 확인하세요.', {
      cause: error,
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    throw new Error('서버 응답을 읽을 수 없습니다.', { cause: error });
  }

  if (
    !response.ok ||
    !payload ||
    payload.success !== true ||
    !Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    const message =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : '요청을 처리하지 못했습니다.';
    const code =
      typeof payload?.error?.code === 'string'
        ? payload.error.code
        : 'INVALID_RESPONSE';
    throw new LogosApiError(message, response.status, code);
  }

  return payload.data;
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`서버가 올바르지 않은 ${label} 데이터를 반환했습니다.`);
  }
}

export async function getTags(signal) {
  const tags = await requestData('/api/tags', { signal });
  assertStringArray(tags, '태그');
  return tags;
}

export async function getWords(
  { tags, query = '', page = 1, pageSize = 20 },
  signal,
) {
  if (!Array.isArray(tags)) {
    throw new TypeError('태그 목록은 배열이어야 합니다.');
  }
  if (typeof query !== 'string' || query.length > 100) {
    throw new TypeError('검색어는 100자 이하의 문자열이어야 합니다.');
  }
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new TypeError('페이지 번호 또는 페이지 크기가 올바르지 않습니다.');
  }

  const searchParams = new URLSearchParams();
  tags.forEach((tag) => searchParams.append('tags', tag));
  if (query.trim()) {
    searchParams.set('q', query.trim());
  }
  searchParams.set('page', String(page));
  searchParams.set('pageSize', String(pageSize));
  const result = await requestData(
    `/api/words?${searchParams.toString()}`,
    { signal },
  );

  if (
    !result ||
    !Array.isArray(result.items) ||
    !result.pagination ||
    !Number.isSafeInteger(result.pagination.page) ||
    result.pagination.page < 1 ||
    !Number.isSafeInteger(result.pagination.pageSize) ||
    result.pagination.pageSize < 1 ||
    result.pagination.pageSize > 100 ||
    !Number.isSafeInteger(result.pagination.total) ||
    result.pagination.total < 0 ||
    !Number.isSafeInteger(result.pagination.totalPages) ||
    result.pagination.totalPages < 0 ||
    result.items.some(
      (word) =>
        !word ||
        typeof word.word_en !== 'string' ||
        typeof word.word_ko !== 'string' ||
        typeof word.pronunciation !== 'string' ||
        !Array.isArray(word.tags) ||
        word.tags.some((tag) => typeof tag !== 'string'),
    )
  ) {
    throw new Error('서버가 올바르지 않은 사전 데이터를 반환했습니다.');
  }

  return result;
}

export async function generateName(tags, signal) {
  if (!Array.isArray(tags)) {
    throw new TypeError('태그 목록은 배열이어야 합니다.');
  }

  const result = await requestData('/api/names/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
    signal,
  });

  const validResultOrder =
    Array.isArray(result) &&
    ((result.length === 1 && result[0]?.caseType === 'noun') ||
      (result.length === 2 &&
        result[0]?.caseType === 'adjective_noun' &&
        result[1]?.caseType === 'noun'));

  if (
    !validResultOrder ||
    result.some(
      (item) =>
        ['mix', 'translation', 'english', 'pronunciation'].some(
          (key) => typeof item[key] !== 'string',
        ),
    )
  ) {
    throw new Error('서버가 올바르지 않은 작명 결과를 반환했습니다.');
  }

  return result;
}
