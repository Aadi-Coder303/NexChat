import redisClient from '../lib/redis';

export class PresenceService {
  private static PRESENCE_PREFIX = 'presence:';
  private static TTL = 35; // 35 seconds

  static async setOnline(userId: string) {
    const key = `${this.PRESENCE_PREFIX}${userId}`;
    await redisClient.set(key, 'online', { EX: this.TTL });
  }

  static async setOffline(userId: string) {
    const key = `${this.PRESENCE_PREFIX}${userId}`;
    await redisClient.del(key);
  }

  static async getStatus(userId: string): Promise<'online' | 'offline'> {
    const key = `${this.PRESENCE_PREFIX}${userId}`;
    const status = await redisClient.get(key);
    return status === 'online' ? 'online' : 'offline';
  }

  static async getOnlineUsers(userIds: string[]): Promise<Record<string, 'online' | 'offline'>> {
    const results: Record<string, 'online' | 'offline'> = {};
    
    // Use pipeline/multi for efficiency if many users
    for (const id of userIds) {
      results[id] = await this.getStatus(id);
    }
    
    return results;
  }
}
