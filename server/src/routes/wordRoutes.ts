import type { FastifyPluginAsync } from 'fastify';
import HttpError = require('../errors/HttpError');
import { parseQueryTags } from '../features/words/tagValidation';
import { listTags, listWords } from '../features/words/wordRepository';

interface WordQuery {
  tags?: string | string[];
  q?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
}

interface ParsedWordQuery {
  query: string;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_MONGO_SKIP = 2147483647;

const errorResponseSchema = {
  type: 'object',
  required: ['success', 'error'],
  properties: {
    success: { type: 'boolean', enum: [false] },
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

const wordRecordSchema = {
  type: 'object',
  required: ['word_en', 'word_ko', 'pronunciation', 'part_of_speech', 'tags'],
  properties: {
    word_en: { type: 'string' },
    word_ko: { type: 'string' },
    pronunciation: { type: 'string' },
    part_of_speech: { type: 'string', enum: ['adjective', 'noun'] },
    tags: { type: 'array', items: { type: 'string' } },
  },
};

const successEnvelope = (data: object) => ({
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', enum: [true] },
    data,
  },
});

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  name: string,
  maximum: number,
): number {
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

function parseWordQuery(query: WordQuery): ParsedWordQuery {
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

const wordRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/tags',
    {
      config: {
        apiDoc: {
          summary: '사용 가능한 태그 조회',
          operationId: 'listTags',
          tags: ['Words'],
          response: {
            200: successEnvelope({
              type: 'array',
              items: { type: 'string' },
            }),
            500: errorResponseSchema,
            503: errorResponseSchema,
          },
        },
      },
    },
    async () => {
      const tags = await listTags();
      return { success: true, data: tags };
    },
  );

  fastify.get<{ Querystring: WordQuery }>(
    '/words',
    {
      config: {
        apiDoc: {
          summary: '사전 단어 검색',
          description:
            '태그는 반복 전달 시 OR 조건으로 검색합니다. q는 영어, 한글, 발음 및 태그에서 검색합니다.',
          operationId: 'listWords',
          tags: ['Words'],
          querystring: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                description: '필터 태그. 여러 값은 반복해서 전달합니다.',
                style: 'form',
                explode: true,
              },
              q: {
                type: 'string',
                maxLength: MAX_SEARCH_LENGTH,
                description: '영어, 한글, 발음 또는 태그 검색어',
              },
              page: {
                type: 'integer',
                minimum: 1,
                default: 1,
                description: '1부터 시작하는 페이지 번호',
              },
              pageSize: {
                type: 'integer',
                minimum: 1,
                maximum: MAX_PAGE_SIZE,
                default: DEFAULT_PAGE_SIZE,
                description: '페이지 크기',
              },
            },
          },
          response: {
            200: successEnvelope({
              type: 'object',
              required: ['items', 'pagination'],
              properties: {
                items: { type: 'array', items: wordRecordSchema },
                pagination: {
                  type: 'object',
                  required: ['page', 'pageSize', 'total', 'totalPages'],
                  properties: {
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            }),
            400: errorResponseSchema,
            500: errorResponseSchema,
            503: errorResponseSchema,
          },
        },
      },
    },
    async (request) => {
      const tags = parseQueryTags(request.query.tags);
      const { query, page, pageSize } = parseWordQuery(request.query);
      const result = await listWords({ tags, query, page, pageSize });
      return { success: true, data: result };
    },
  );
};

export = wordRoutes;