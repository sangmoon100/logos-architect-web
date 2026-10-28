import type {
  ErrorRequestHandler,
  RequestHandler,
} from 'express';
import HttpError = require('../errors/HttpError');
import { MongoConnectionError } from '../utils/mongoConnection';

function safeLabel(value: unknown): string {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9_./-]/g, '')
    .slice(0, 80);
}

function getErrorProperty(
  error: unknown,
  property: 'type' | 'name' | 'code',
): unknown {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  return Reflect.get(error, property);
}

export const notFoundHandler: RequestHandler = (
  _request,
  _response,
  next,
) => {
  next(new HttpError(404, 'NOT_FOUND', '요청 경로를 찾을 수 없습니다'));
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (getErrorProperty(error, 'type') === 'entity.parse.failed') {
    response.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: '요청 본문 JSON 형식이 올바르지 않습니다' },
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof MongoConnectionError) {
    response.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: '데이터베이스를 일시적으로 사용할 수 없습니다',
      },
    });
    return;
  }

  const errorName = safeLabel(getErrorProperty(error, 'name'));
  const errorCode = safeLabel(getErrorProperty(error, 'code'));
  console.error(
    `[api] request failed | context(method=${request.method},path=${request.path},error=${errorName},code=${errorCode})`,
  );

  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '요청을 처리하는 중 문제가 발생했습니다',
    },
  });
};
