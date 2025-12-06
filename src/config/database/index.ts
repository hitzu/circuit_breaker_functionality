import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

export { AppDataSource } from './data-source';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => {
  const nodeEnv = process.env.NODE_ENV || 'local';
  const isProd = nodeEnv === 'prod';

  dotenv.config({
    path: path.join(__dirname, '../../../', `.env.${nodeEnv}`),
  });

  const url = process.env.SUPABASE_DB_URL;

  const defaults = {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'bookandsign_dev',
  };

  return {
    type: 'postgres',
    url,
    host: process.env.DB_HOST || defaults.host,
    port: parseInt(process.env.DB_PORT || String(defaults.port), 10),
    username: process.env.DB_USERNAME || defaults.username,
    password: process.env.DB_PASSWORD || defaults.password,
    database: process.env.DB_NAME || defaults.database,

    entities: [path.join(__dirname, '../../**/entities/*.entity{.ts,.js}')],
    migrations: [
      path.join(__dirname, '../../database/migrations/**/*{.ts,.js}'),
    ],
    synchronize: false,
    logging: false,
    dropSchema: false,

    ...(isProd && {
      ssl: { rejectUnauthorized: false },
      poolSize: 20,
      extra: {
        max: 20,
        connectionTimeoutMillis: 2000,
      },
    }),
  };
};
