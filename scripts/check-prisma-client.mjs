import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();
const keys = Object.keys(p).filter(k => !k.startsWith('_') && !k.startsWith('$'));
console.log('auditReport in client:', 'auditReport' in p ? '✅ YES' : '❌ NO');
console.log('All model keys:', keys.join(', '));
await p.$disconnect();
