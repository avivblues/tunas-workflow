import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import { getAttachmentStream, uploadAttachment } from '../../core/attachment/attachment.service.js';

export async function registerAttachmentRoutes(app: FastifyInstance) {
  app.post('/attachment/upload', { preHandler: app.authenticate }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({
        success: false,
        errorCode: 'NO_FILE',
        message: 'No file uploaded',
      });
    }

    const buffer = await file.toBuffer();
    const attachment = await uploadAttachment(
      request.tenantId!,
      buffer,
      file.filename,
      file.mimetype,
    );

    return sendSuccess(reply, attachment, 'File uploaded', 201);
  });

  app.get('/attachment/file/*', { preHandler: app.authenticate }, async (request, reply) => {
    const key = (request.params as { '*': string })['*'];
    if (!key) {
      return reply.status(400).send({
        success: false,
        errorCode: 'INVALID_KEY',
        message: 'File key required',
      });
    }

    const decodedKey = decodeURIComponent(key);
    const file = await getAttachmentStream(decodedKey, request.tenantId!);

    return reply
      .header('Content-Type', file.mimeType)
      .header('Content-Disposition', `inline; filename="${file.filename}"`)
      .send(file.stream);
  });
}
