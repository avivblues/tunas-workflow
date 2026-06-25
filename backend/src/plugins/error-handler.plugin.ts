import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, error } from '../lib/response.js';
import { ZodError } from 'zod';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | AppError | ZodError, _request, reply: FastifyReply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(error(err.errorCode, err.message));
    }

    if (err instanceof ZodError) {
      const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return reply.status(400).send(error('VALIDATION_ERROR', message));
    }

    if (err.validation) {
      return reply.status(400).send(error('VALIDATION_ERROR', err.message));
    }

    app.log.error(err);
    return reply.status(500).send(error('INTERNAL_ERROR', 'An unexpected error occurred'));
  });

  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send(error('NOT_FOUND', 'Resource not found'));
  });
}
