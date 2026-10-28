import HttpError = require('../../errors/HttpError');

export function normalizeTags(values: readonly unknown[]): string[] {
  const normalizedTags = values.map((tag) => {
    if (typeof tag !== 'string' || tag.trim() === '') {
      throw new HttpError(
        400,
        'INVALID_TAGS',
        '태그는 비어 있지 않은 문자열이어야 합니다',
      );
    }

    return tag.trim();
  });

  return [...new Set(normalizedTags)];
}

export function parseQueryTags(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }

  return normalizeTags(Array.isArray(value) ? value : [value]);
}

export function parseBodyTags(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_TAGS', 'tags는 문자열 배열이어야 합니다');
  }

  return normalizeTags(value);
}
