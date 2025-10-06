import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

class RedisClient {
    constructor() {
        this.master = new Redis({
            port: process.env.REDIS_MASTER_PORT,
            host: process.env.REDIS_MASTER_HOST,
            password: process.env.REDIS_PASSWORD,
            retryDelayOnFailover: 1000,
            maxRetriesPerRequest: 3
        });

        this.replica = new Redis({
            port: process.env.REDIS_REPLICA_PORT,
            host: process.env.REDIS_REPLICA_HOST,
            password: process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: 3
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.master.on('connect', () => {
            console.log('Connected to Redis Master');
        });

        this.master.on('error', (error) => {
            console.error('Redis Master Error:', error);
        });

        this.replica.on('connect', () => {
            console.log('Connected to Redis Replica');
        });

        this.replica.on('error', (error) => {
            console.error('Redis Replica Error:', error);
        });
    }

    async write(key, value) {
        return await this.master.set(key, JSON.stringify(value));
    }

    async read(key) {
        const data = await this.replica.get(key);
        return data ? JSON.parse(data) : null;
    }

    async healthCheck() {
        try {
            await this.master.ping();
            await this.replica.ping();
            return true;
        } catch {
            return false;
        }
    }
}

// Export the class
export default RedisClient;