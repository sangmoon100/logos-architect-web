import fastifyCors = require('@fastify/cors');
import fastifyStatic = require('@fastify/static');
import fastifySwagger = require('@fastify/swagger');
import fastifySwaggerUi = require('@fastify/swagger-ui');
import Fastify = require('fastify');
import type { FastifyPluginAsync } from 'fastify';
import path = require('node:path');
import { config } from './config/env';
import { createOriginCallback } from './config/cors';
import { errorHandler } from './middleware/errorHandler';
import nameRoutes = require('./routes/nameRoutes');
import wordRoutes = require('./routes/wordRoutes');

const clientBuildDirectory = path.resolve(__dirname, '../../client/dist');

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/health',
    {
      config: {
        apiDoc: {
          summary: '서버 상태 확인',
          operationId: 'getHealth',
          tags: ['Health'],
          response: {
            200: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['ok'] },
              },
            },
          },
        },
      },
    },
    async () => ({ status: 'ok' }),
  );
};

export function buildApp() {
  const app = Fastify({ logger: false });

  app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Logos Architect API',
        description: '태그 기반 단어 사전 및 랜덤 작명 API',
        version: '1.2.0',
      },
      servers: [{ url: '/' }],
      tags: [
        { name: 'Health', description: '서버 상태 확인' },
        { name: 'Words', description: '단어 및 태그 조회' },
        { name: 'Names', description: '이름 생성' },
      ],
    },
    transform: ({ schema, route, url }) => ({
      url,
      schema: route.config?.apiDoc
        ? { ...schema, ...route.config.apiDoc }
        : { ...schema, hide: true },
    }),
  });
  app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
  app.register(fastifyCors, {
    origin: createOriginCallback(config),
  });
  app.register(fastifyStatic, {
    root: clientBuildDirectory,
    wildcard: false,
  });
  app.register(healthRoutes);
  app.register(wordRoutes, { prefix: '/api' });
  app.register(nameRoutes, { prefix: '/api' });

  app.setNotFoundHandler((request, reply) => {
    const requestPath = request.url.split('?')[0];
    const isApiPath =
      requestPath === '/api' || requestPath.startsWith('/api/');

    if (request.method === 'GET' && !isApiPath) {
      return reply.type('text/html').sendFile('index.html');
    }

    return reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '요청 경로를 찾을 수 없습니다',
      },
    });
  });
  app.setErrorHandler(errorHandler);

  return app;
}