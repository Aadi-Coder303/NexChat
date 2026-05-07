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
