const express = require('express');
const HttpError = require('../errors/HttpError');
const { listTags, listWords } = require('../features/words/wordRepository');
const { parseQueryTags } = require('../features/words/tagValidation');

const router = express.Router();
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_MONGO_SKIP = 2147483647;

function asyncHandler(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response)).catch(next);
  };
}

function parsePositiveInteger(value, fallback, name, maximum) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'INVALID_PAGINATION', `${name}은 양의 정수여야 합니다`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new HttpError(400, 'INVALID_PAGINATION', `${name} 값이 허용 범위를 벗어났습니다`);
  }
  return parsed;
}

function parseWordQuery(query) {
  const search = query.q === undefined ? '' : query.q;
  if (typeof search !== 'string' || search.length > MAX_SEARCH_LENGTH) {
    throw new HttpError(
      400,
      'INVALID_SEARCH',
      `검색어는 ${MAX_SEARCH_LENGTH}자 이하의 문자열이어야 합니다`,
    );
  }

  const page = parsePositiveInteger(
    query.page,
    1,
    'page',
    Number.MAX_SAFE_INTEGER,
  );
  const pageSize = parsePositiveInteger(
    query.pageSize,
    DEFAULT_PAGE_SIZE,
    'pageSize',
    MAX_PAGE_SIZE,
  );
  if ((page - 1) * pageSize > MAX_MONGO_SKIP) {
    throw new HttpError(400, 'INVALID_PAGINATION', '요청 페이지가 허용 범위를 벗어났습니다');
  }

  return { query: search.trim(), page, pageSize };
}

router.get(
  '/tags',
  asyncHandler(async (request, response) => {
    const tags = await listTags();
    response.json({ success: true, data: tags });
  }),
);

router.get(
  '/words',
  asyncHandler(async (request, response) => {
    const tags = parseQueryTags(request.query.tags);
    const { query, page, pageSize } = parseWordQuery(request.query);
    const result = await listWords({ tags, query, page, pageSize });
    response.json({ success: true, data: result });
  }),
);

module.exports = router;
