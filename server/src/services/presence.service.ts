import redisClient from '../lib/redis';

export class PresenceService {
  private static PRESENCE_PREFIX = 'presence:';
  private static TTL = 35; // 35 seconds

  static async setOnline(userId: string) {
    try {
      const key = `${this.PRESENCE_PREFIX}${userId}`;
      await redisClient.set(key, 'online', { EX: this.TTL });
    } catch (error) {
      console.error(`[Presence] Error setting online for ${userId}:`, error);
    }
  }

  static async setOffline(userId: string) {
    try {
      const key = `${this.PRESENCE_PREFIX}${userId}`;
      await redisClient.del(key);
    } catch (error) {
      console.error(`[Presence] Error setting offline for ${userId}:`, error);
    }
  }

  static async getStatus(userId: string): Promise<'online' | 'offline'> {
    try {
      const key = `${this.PRESENCE_PREFIX}${userId}`;
      const status = await redisClient.get(key);
      return status === 'online' ? 'online' : 'offline';
    } catch (error) {
      console.error(`[Presence] Error getting status for ${userId}:`, error);
      return 'offline'; // Fallback to offline if redis is down
    }
  }

  static async getOnlineUsers(userIds: string[]): Promise<Record<string, 'online' | 'offline'>> {
    const results: Record<string, 'online' | 'offline'> = {};
    
    try {
      // Use pipeline/multi for efficiency if many users
      for (const id of userIds) {
        results[id] = await this.getStatus(id);
      }
    } catch (error) {
      console.error('[Presence] Error getting online users:', error);
      // Fill with offline if everything fails
      for (const id of userIds) {
        results[id] = 'offline';
      }
    }
    
    return results;
  }
}
