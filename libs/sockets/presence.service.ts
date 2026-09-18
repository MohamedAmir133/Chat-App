import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

@Injectable()
export class PresenceService implements OnModuleInit {
  private readonly logger = new Logger(PresenceService.name);

  private readonly redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
      })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      });

  constructor(private readonly jwtService: JwtService) {}

  async onModuleInit() {
    try {
      await this.redis.ping();
      this.logger.log(
        `Redis connected at ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      );
      // Don't clear presence keys on startup — let them naturally expire or get overwritten.
      // Clearing on every server restart causes race conditions with socket connections.
      this.logger.log('PresenceService initialized (presence keys preserved)');
    } catch (err) {
      this.logger.error(`Redis connection failed: ${(err as Error).message}`);
    }
  }

  // ─── Key helper ────────────────────────────────────────────────────────────
  private presenceKey(userId: string): string {
    return `presence:${userId}`;
  }

  // ─── Token verification ────────────────────────────────────────────────────
  /**
   * Verify a JWT and return the `id` (or `sub`) claim, or null if invalid.
   */
  async verifyTokenAndGetUserId(token: string): Promise<string | null> {
    try {
      const payload = this.jwtService.verify<{ id?: string; sub?: string }>(
        token,
        { secret: process.env.JWT_SECRET },
      );
      const userId = payload.id ?? payload.sub ?? null;
      return userId ? String(userId) : null;
    } catch (err) {
      this.logger.warn(`Token verification failed: ${(err as Error).message}`);
      return null;
    }
  }

  // ─── Presence tracking ─────────────────────────────────────────────────────
  /**
   * Register a new socket connection for a user.
   * Adds `clientId` to the Redis set `presence:{userId}`.
   * @returns `true` when this is the user's **first** active connection.
   */
  async userConnected(userId: string, clientId: string): Promise<boolean> {
    try {
      const key = this.presenceKey(userId);

      // SADD returns 1 if the element was newly added, 0 if it already existed.
      //store set of sockets connected to one user in redis, so we can track how many sockets are connected to the same user
      const added = await this.redis.sadd(key, clientId);
      this.logger.log(
        `[userConnected] userId=${userId} clientId=${clientId} — added=${added}`,
      );

      // SCARD returns the total number of members in the set.
      const count = await this.redis.scard(key);
      this.logger.log(
        `[userConnected] userId=${userId} now has ${count} connection(s)`,
      );

      return count === 1; // true → first connection
    } catch (err) {
      this.logger.error(
        `userConnected error for ${userId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * De-register a socket connection for a user.
   * Removes `clientId` from the Redis set `presence:{userId}`.
   * @returns `true` when the user has **no remaining** active connections.
   */
  async userDisconnected(userId: string, clientId: string): Promise<boolean> {
    try {
      const key = this.presenceKey(userId);

      // SREM removes the element; returns the number of elements removed.
      await this.redis.srem(key, clientId);

      // SCARD after removal tells us if any connections remain.
      const count = await this.redis.scard(key);
      return count === 0; // true → last connection gone
    } catch (err) {
      this.logger.error(
        `userDisconnected error for ${userId}: ${(err as Error).message}`,
      );
      return true; // assume offline on error to avoid ghost-online state
    }
  }

  /**
   * Completely clear presence for a user (e.g. on explicit logout).
   * Deletes the Redis set `presence:{userId}`.
   */
  async clearUserPresence(userId: string): Promise<void> {
    try {
      const key = this.presenceKey(userId);
      await this.redis.del(key);
      this.logger.log(
        `[clearUserPresence] Cleared presence key for userId=${userId}`,
      );
    } catch (err) {
      this.logger.error(
        `clearUserPresence error for ${userId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Check whether a user currently has any active connections.
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const count = await this.redis.scard(this.presenceKey(userId));
      return count > 0;
    } catch (err) {
      this.logger.error(
        `isUserOnline error for ${userId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Return the number of active socket connections for a user.
   */
  async getConnectionCount(userId: string): Promise<number> {
    try {
      return await this.redis.scard(this.presenceKey(userId));
    } catch {
      return 0;
    }
  }

  /**
   * Return an array of all userIds that currently have at least one active
   * socket connection. Uses a Redis key-scan on the `presence:*` pattern.
   */
  async getAllOnlineUserIds(): Promise<string[]> {
    try {
      let cursor = '0';
      const keys: string[] = [];

      // Use SCAN instead of KEYS to prevent blocking the Redis event loop
      do {
        const [nextCursor, batch] = await this.redis.scan(
          cursor,
          'MATCH',
          'presence:*',
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');

      this.logger.log(
        `[getAllOnlineUserIds] Found ${keys.length} presence keys`,
      );

      if (!keys.length) return [];

      // Filter to keys that still have members (count > 0)
      const pipeline = this.redis.pipeline();
      keys.forEach((k) => pipeline.scard(k));
      const results = await pipeline.exec();

      const onlineUserIds = keys
        .filter((_, i) => {
          const count = results?.[i]?.[1] as number;
          return count > 0;
        })
        .map((k) => k.replace('presence:', ''));

      return onlineUserIds;
    } catch (err) {
      this.logger.error(`getAllOnlineUserIds error: ${(err as Error).message}`);
      return [];
    }
  }
}
