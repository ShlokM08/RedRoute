// scripts/clear-users.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Delete ALL users and cascade to relations if configured
  await prisma.user.deleteMany({});
  console.log('✅ All users deleted');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
