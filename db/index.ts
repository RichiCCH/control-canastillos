import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  : (null as unknown as Pool);

export const db = connectionString
  ? drizzle(pool, { schema })
  : (null as unknown as ReturnType<typeof drizzle>);

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.warn('DATABASE_URL no está definida');
}
