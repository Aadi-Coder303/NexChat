import { Router } from 'express';
import { MessageService } from '../services/message.service';
import { ChannelService } from '../services/channel.service';

const router = Router();

// Get user's channels
router.get('/', async (req: any, res, next) => {
  try {
    const channels = await ChannelService.getUserChannels(req.userId);
    res.json(channels);
  } catch (error: any) {
    next(error);
  }
});

// Create a new channel
router.post('/', async (req: any, res, next) => {
  try {
    const { name, type, memberIds } = req.body;
    const channel = await ChannelService.createChannel(
      name,
      type,
      req.userId,
      memberIds || [req.userId]
    );
    res.status(201).json(channel);
  } catch (error: any) {
    next(error);
  }
});

// Connect with a friend via NexCode
router.post('/connect', async (req: any, res, next) => {
  try {
    const { code } = req.body;
    
    // Find user by code
    const friend = await prisma.user.findUnique({
      where: { friendCode: code.toUpperCase() },
      select: { id: true, username: true }
    });

    if (!friend) {
      return res.status(404).json({ error: 'Identity not found in the void' });
    }

    if (friend.id === req.userId) {
      return res.status(400).json({ error: 'You cannot connect with your own apparition' });
    }

    // Create direct channel
    const channel = await ChannelService.createChannel(
      friend.username,
      'direct',
      req.userId,
      [req.userId, friend.id]
    );

    res.status(201).json(channel);
  } catch (error: any) {
    next(error);
  }
});

// Get messages for a channel (paginated)
router.get('/:id/messages', async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { cursor, limit } = req.query;
    
    const messages = await MessageService.getMessages(
      id,
      req.userId,
      cursor as string, 
      limit ? parseInt(limit as string) : 50
    );
    
    res.json(messages);
  } catch (error: any) {
    next(error);
  }
});

export default router;
