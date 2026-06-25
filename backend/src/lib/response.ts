import type { FastifyReply } from 'fastify';
import type { ApiErrorResponse, ApiSuccessResponse } from '../types/api-response.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function success<T>(data: T, message = ''): ApiSuccessResponse<T> {
  return { success: true, data, message };
}

export function error(errorCode: string, message: string): ApiErrorResponse {
  return { success: false, errorCode, message };
}

export function sendSuccess<T>(reply: FastifyReply, data: T, message = '', statusCode = 200) {
  return reply.status(statusCode).send(success(data, message));
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  errorCode: string,
  message: string,
) {
  return reply.status(statusCode).send(error(errorCode, message));
}
