import type { FastifySchema } from 'fastify';

declare module 'fastify' {
  interface FastifyContextConfig {
    apiDoc?: FastifySchema & {
      summary?: string;
      description?: string;
      operationId?: string;
      tags?: string[];
    };
  }
}
