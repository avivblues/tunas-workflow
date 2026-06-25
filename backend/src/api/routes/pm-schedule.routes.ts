import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../lib/response.js';
import {
  calendarQuerySchema,
  createPmScheduleSchema,
  updatePmScheduleSchema,
} from '../../core/scheduler/pm-schedule.schema.js';
import {
  createPmSchedule,
  getPmCalendar,
  getPmCompliance,
  listPmSchedules,
  updatePmSchedule,
} from '../../core/scheduler/pm-schedule.service.js';
import { processDuePmSchedules } from '../../core/scheduler/scheduler.service.js';

export async function registerPmScheduleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/pm-schedule', async (request, reply) => {
    const items = await listPmSchedules(request.tenantId!);
    return sendSuccess(reply, items);
  });

  app.post('/pm-schedule', async (request, reply) => {
    const input = createPmScheduleSchema.parse(request.body);
    const schedule = await createPmSchedule(request.tenantId!, input);
    return sendSuccess(reply, schedule, 'PM schedule created', 201);
  });

  app.patch('/pm-schedule/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updatePmScheduleSchema.parse(request.body);
    const schedule = await updatePmSchedule(request.tenantId!, id, input);
    return sendSuccess(reply, schedule, 'PM schedule updated');
  });

  app.get('/pm-schedule/calendar', async (request, reply) => {
    const query = calendarQuerySchema.parse(request.query);
    const data = await getPmCalendar(request.tenantId!, query.from, query.to);
    return sendSuccess(reply, data);
  });

  app.get('/pm-schedule/compliance', async (request, reply) => {
    const data = await getPmCompliance(request.tenantId!);
    return sendSuccess(reply, data);
  });

  app.post('/pm-schedule/run-due', async (request, reply) => {
    const result = await processDuePmSchedules(request.tenantId!);
    return sendSuccess(reply, result, 'Due PM schedules processed');
  });
}
