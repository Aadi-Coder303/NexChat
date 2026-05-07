import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  
  // Using transactions to clear everything
  await prisma.$transaction([
    prisma.reaction.deleteMany(),
    prisma.message.deleteMany(),
    prisma.channelMember.deleteMany(),
    prisma.channelSession.deleteMany(),
    prisma.channel.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('Database cleared successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
