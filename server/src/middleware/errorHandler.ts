import type { FastifyReply, FastifyRequest } from 'fastify';
import HttpError = require('../errors/HttpError');
import { MongoConnectionError } from '../utils/mongoConnection';

function getErrorProperty(
  error: unknown,
  property: 'code' | 'name',
): unknown {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  return Reflect.get(error, property);
}

function safeLabel(value: unknown): string {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9_./-]/g, '')
    .slice(0, 80);
}

export function errorHandler(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }

  if (error instanceof MongoConnectionError) {
    return reply.code(503).send({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: '데이터베이스를 일시적으로 사용할 수 없습니다',
      },
    });
  }

  const errorCode = getErrorProperty(error, 'code');
  if (
    errorCode === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
    errorCode === 'FST_ERR_CTP_EMPTY_JSON_BODY'
  ) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: '요청 본문 JSON 형식이 올바르지 않습니다',
      },
    });
  }

  const errorName = safeLabel(getErrorProperty(error, 'name'));
  const safeCode = safeLabel(errorCode);
  const requestPath = request.url.split('?')[0];
  console.error(
    `[api] request failed | context(method=${request.method},path=${requestPath},error=${errorName},code=${safeCode})`,
  );

  return reply.code(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '요청을 처리하는 중 문제가 발생했습니다',
    },
  });
}