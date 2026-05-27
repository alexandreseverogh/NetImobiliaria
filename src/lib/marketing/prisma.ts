import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Create a global singleton for Prisma to avoid exhausting connection pools
// during hot reloads in development.
const globalForPrisma = global as unknown as { prismaMarketing: PrismaClient };

let prismaMarketing: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const connectionString = process.env.MARKETING_DATABASE_URL!;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool, { schema: 'campanhasmarketingdigital' });
  prismaMarketing = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prismaMarketing) {
    const connectionString = process.env.MARKETING_DATABASE_URL!;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool, { schema: 'campanhasmarketingdigital' });
    globalForPrisma.prismaMarketing = new PrismaClient({ adapter });
  }
  prismaMarketing = globalForPrisma.prismaMarketing;
}

export default prismaMarketing;
// Named export para uso nas API routes: import { prisma } from '@/lib/marketing/prisma'
export { prismaMarketing as prisma };
