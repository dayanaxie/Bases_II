// base-repository.js
import RedisClient from '../config/redis.js';

class BaseRepository {
    constructor() {
        this.redis = new RedisClient();
        this.cacheEnabled = true;
    }

    async cachedOperation(cacheKey, operation, ttl = 300) {
        if (!this.cacheEnabled) {
            return await operation();
        }

        // Try to read from cache first
        const cached = await this.redis.read(cacheKey);
        if (cached) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return cached;
        }

        // Execute the operation and cache result
        console.log(`Cache miss for key: ${cacheKey}`);
        const result = await operation();
        
        if (result !== null && result !== undefined) {
            await this.redis.write(cacheKey, result);
            if (ttl) {
                await this.redis.master.expire(cacheKey, ttl);
            }
        }
        
        return result;
    }

    async invalidateCache(cacheKey) {
        if (!this.cacheEnabled) return;
        
        try {
            await this.redis.master.del(cacheKey);
            console.log(`Cache invalidated for key: ${cacheKey}`);
        } catch (error) {
            console.error('Error invalidating cache:', error);
        }
    }

    async invalidatePattern(pattern) {
        if (!this.cacheEnabled) return;
        
        try {
            const keys = await this.redis.master.keys(pattern);
            if (keys.length > 0) {
                await this.redis.master.del(...keys);
                console.log(`Cache invalidated for pattern: ${pattern} (${keys.length} keys)`);
            }
        } catch (error) {
            console.error('Error invalidating cache pattern:', error);
        }
    }

    generateQueryHash(query, params = {}) {
        const queryString = JSON.stringify({ query, params });
        let hash = 0;
        for (let i = 0; i < queryString.length; i++) {
            const char = queryString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `eschequer-y-${Math.abs(hash)}`;
    }

    generateUserKey(userId) {
        return `user:${userId}`;
    }

    generateUserRelationshipsKey(userId) {
        return `user:relationships:${userId}`;
    }

    generateFollowersKey(userId) {
        return `user:followers:${userId}`;
    }

    generateFollowingKey(userId) {
        return `user:following:${userId}`;
    }

    generateSessionKey(userId) {
        return `session:${userId}`;
    }
}

export default BaseRepository;