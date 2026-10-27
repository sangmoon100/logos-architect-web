const HttpError = require('../errors/HttpError');
const { MongoConnectionError } = require('../utils/mongoConnection');

function safeLabel(value) {
  return String(value || 'unknown').replace(/[^a-zA-Z0-9_./-]/g, '').slice(0, 80);
}

function notFoundHandler(request, response, next) {
  next(new HttpError(404, 'NOT_FOUND', '요청 경로를 찾을 수 없습니다'));
}

function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error && error.type === 'entity.parse.failed') {
    return response.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: '요청 본문 JSON 형식이 올바르지 않습니다' },
    });
  }

  if (error instanceof HttpError) {
    return response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }

  if (error instanceof MongoConnectionError) {
    return response.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: '데이터베이스를 일시적으로 사용할 수 없습니다',
      },
    });
  }

  const errorName = safeLabel(error && error.name);
  const errorCode = safeLabel(error && error.code);
  console.error(
    `[api] request failed | context(method=${request.method},path=${request.path},error=${errorName},code=${errorCode})`,
  );

  return response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '요청을 처리하는 중 문제가 발생했습니다',
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
