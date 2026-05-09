import redisClient from '../lib/redis';

export type PresenceStatus = 'online' | 'idle' | 'offline';

export class PresenceService {
  private static PRESENCE_PREFIX = 'presence:';
  private static ONLINE_TTL  = 35;   // 35 seconds (heartbeat keeps it alive)
  private static IDLE_TTL    = 3600; // 1 hour (manual idle mode)

  static async setStatus(userId: string, status: PresenceStatus) {
    try {
      const key = `${this.PRESENCE_PREFIX}${userId}`;
      if (status === 'offline') {
        await redisClient.del(key);
      } else {
        const ttl = status === 'idle' ? this.IDLE_TTL : this.ONLINE_TTL;
        await redisClient.set(key, status, { EX: ttl });
      }
    } catch (error) {
      console.error(`[Presence] Error setting status for ${userId}:`, error);
    }
  }

  static async setOnline(userId: string) {
    return this.setStatus(userId, 'online');
  }

  static async setOffline(userId: string) {
    return this.setStatus(userId, 'offline');
  }

  static async getStatus(userId: string): Promise<PresenceStatus> {
    try {
      const key = `${this.PRESENCE_PREFIX}${userId}`;
      const status = await redisClient.get(key);
      if (status === 'online' || status === 'idle') return status;
      return 'offline';
    } catch (error) {
      console.error(`[Presence] Error getting status for ${userId}:`, error);
      return 'offline';
    }
  }

  static async getOnlineUsers(userIds: string[]): Promise<Record<string, PresenceStatus>> {
    const results: Record<string, PresenceStatus> = {};
    try {
      for (const id of userIds) {
        results[id] = await this.getStatus(id);
      }
    } catch (error) {
      console.error('[Presence] Error getting online users:', error);
      for (const id of userIds) {
        results[id] = 'offline';
      }
    }
    return results;
  }
}
