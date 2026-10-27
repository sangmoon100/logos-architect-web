const HttpError = require('../../errors/HttpError');

function normalizeTags(values) {
  if (
    values.some(
      (tag) => typeof tag !== 'string' || tag.trim() === '',
    )
  ) {
    throw new HttpError(
      400,
      'INVALID_TAGS',
      '태그는 비어 있지 않은 문자열이어야 합니다',
    );
  }

  return [...new Set(values.map((tag) => tag.trim()))];
}

function parseQueryTags(value) {
  if (value === undefined) {
    return [];
  }

  return normalizeTags(Array.isArray(value) ? value : [value]);
}

function parseBodyTags(value) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'INVALID_TAGS', 'tags는 문자열 배열이어야 합니다');
  }

  return normalizeTags(value);
}

module.exports = { parseQueryTags, parseBodyTags, normalizeTags };
