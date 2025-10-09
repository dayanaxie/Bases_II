import RedisClient from '../config/redis.js';

async function testRedis() {
    const redisClient = new RedisClient();
    
    try {
        console.log('Testing Redis connection...');
        
        // Health check
        const healthy = await redisClient.healthCheck();
        console.log('Redis healthy:', healthy);
        
        if (healthy) {
            // Test write/read
            await redisClient.write('test', { 
                message: 'Hello from Docker Redis!',
                timestamp: new Date().toISOString()
            });
            console.log('Data written to Redis');
            
            // Test read
            const data = await redisClient.read('test');
            console.log('Retrieved data:', data);
            
            console.log('✅ Redis test passed!');
        } else {
            console.log('❌ Redis health check failed');
        }
        
    } catch (error) {
        console.error('Error testing Redis:', error);
    } finally {
        // Close connections
        await redisClient.master.quit();
        await redisClient.replica.quit();
    }
}

testRedis();