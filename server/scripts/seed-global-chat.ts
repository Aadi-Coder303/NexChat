import { ChannelService } from '../src/services/channel.service';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Ensuring global channels exist...');
  
  const openChat = await ChannelService.ensureGlobalChannel('Open Chat');
  console.log(`Global channel ensured: ${openChat.name} (${openChat.id})`);

  const feedback = await ChannelService.ensureGlobalChannel('Feedback', [
    'Welcome to the Feedback section!',
    'Please post your feedback, suggestions, or bug reports here. Everyone can see and post!'
  ]);
  console.log(`Global channel ensured: ${feedback.name} (${feedback.id})`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
