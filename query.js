const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe('SELECT prosrc FROM pg_proc WHERE proname = \'get_sidebar_menu_for_user\'').then(console.log).finally(() => prisma.$disconnect());
