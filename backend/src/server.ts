import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startIntegrationWorker } from './core/integration/integration-worker.service.js';
import { startPmScheduler } from './core/scheduler/scheduler.service.js';
import { startMqttBridge } from './integration/tunas-iot/mqtt-bridge.service.js';

async function main() {
  const app = await buildApp();

  startPmScheduler(60_000);

  if (env.INTEGRATION_WORKER_ENABLED) {
    startIntegrationWorker(env.INTEGRATION_WORKER_INTERVAL_MS);
    app.log.info('[Integration Worker] Started');
  }

  void startMqttBridge().then((client) => {
    if (client) app.log.info('[MQTT Bridge] Started');
  });

  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT });
    app.log.info(`Tunas Workflow API listening on http://${env.API_HOST}:${env.API_PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

main();
