import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';
const isNeon = connectionString.includes('neon.tech');

let pool: Pool;

if (isNeon) {
  try {
    const url = new URL(connectionString);
    pool = new Pool({
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.replace('/', ''),
      ssl: {
        rejectUnauthorized: false,
        servername: url.hostname // Essential for Neon virtual host TLS routing
      }
    });
  } catch {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
} else {
  pool = new Pool({ connectionString });
}

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
