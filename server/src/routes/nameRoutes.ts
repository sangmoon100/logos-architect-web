import type { FastifyPluginAsync } from 'fastify';
import HttpError = require('../errors/HttpError');
import { generateNames } from '../features/names/nameGenerator';
import { parseBodyTags } from '../features/words/tagValidation';
import { listCandidates } from '../features/words/wordRepository';

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

const successResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', enum: [true] },
    data: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'caseType',
          'mix',
          'translation',
          'english',
          'pronunciation',
        ],
        properties: {
          caseType: { type: 'string', enum: ['adjective_noun', 'noun'] },
          mix: { type: 'string' },
          translation: { type: 'string' },
          english: { type: 'string' },
          pronunciation: { type: 'string' },
        },
      },
    },
  },
};

function readBodyTags(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('tags' in body)) {
    return undefined;
  }

  return Reflect.get(body, 'tags');
}

const nameRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: unknown }>(
    '/names/generate',
    {
      config: {
        apiDoc: {
          summary: '이름 생성',
          description:
            '선택한 태그에 해당하는 형용사와 명사 후보로 조합 이름과 명사 단독 이름을 생성합니다.',
          operationId: 'generateNames',
          tags: ['Names'],
          body: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                description: '후보 단어를 필터링할 태그 목록',
              },
            },
          },
          response: {
            200: successResponseSchema,
            400: errorResponseSchema,
            422: errorResponseSchema,
            500: errorResponseSchema,
            503: errorResponseSchema,
          },
        },
      },
    },
    async (request) => {
      const tags = parseBodyTags(readBodyTags(request.body));
      const [adjectives, nouns] = await Promise.all([
        listCandidates('adjective', tags),
        listCandidates('noun', tags),
      ]);

      if (nouns.length === 0) {
        throw new HttpError(
          422,
          'NO_MATCHING_WORDS',
          '선택한 조건에서 작명할 명사를 찾을 수 없습니다',
        );
      }

      return { success: true, data: generateNames(adjectives, nouns) };
    },
  );
};

export = nameRoutes;