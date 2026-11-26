import dataSource from './data-source';
import { logger } from '../logging';

async function migrate(): Promise<void> {
  const started = performance.now();
  const fields = { dependency: 'postgres', operation: 'migrate' };
  let stage = 'connect';
  try {
    await dataSource.initialize();
    stage = 'apply';
    await dataSource.runMigrations();
    stage = 'disconnect';
    await dataSource.destroy();
    logger.info('database.migrations', 'Payment database migrations completed', {
      ...fields, outcome: 'completed', duration_ms: performance.now() - started,
    });
  } catch {
    logger.fatal('database.migrations', 'Payment database migrations failed', {
      ...fields, stage, outcome: 'failed', duration_ms: performance.now() - started,
    });
    process.exitCode = 1;
    if (dataSource.isInitialized) await dataSource.destroy().catch(() => undefined);
  }
}

void migrate();
