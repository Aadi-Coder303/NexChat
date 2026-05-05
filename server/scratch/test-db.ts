import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to DB...');
    await prisma.$connect();
    console.log('Connected successfully!');
    const users = await prisma.user.count();
    console.log(`User count: ${users}`);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
