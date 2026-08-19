const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const history = await prisma.reportHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log(JSON.stringify(history[0].data, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
