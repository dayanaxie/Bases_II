// user-repository.js
import BaseRepository from './base-repository.js';
import mongoose from 'mongoose';
import { 
    followUser, 
    unfollowUser, 
    isFollowing, 
    getFollowers, 
    getFollowing,
    createUserReferenceInNeo4j 
} from './neo4j.js';

class UserRepository extends BaseRepository {
    constructor(mongoClient, neo4jDriver) {
        super();
        this.mongo = mongoClient;
        this.User = mongoose.model('User');
        this.neo4j = neo4jDriver;
    }

    // READ operations with caching
    async getUserById(userId) {
        const cacheKey = this.generateUserKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            const user = await this.User.findById(userId).lean();
            return user;
        }, 600);
    }

    async getUserWithRelationships(userId) {
        const cacheKey = this.generateUserRelationshipsKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            // Use your existing Neo4j functions
            const [followers, following, isFollowData] = await Promise.all([
                this.getFollowers(userId),
                this.getFollowing(userId),
                this.isFollowing('someUserId', userId) // Adjust as needed
            ]);
            
            return {
                user: await this.getUserById(userId),
                followers,
                following,
                isFollowing: isFollowData
            };
        }, 300);
    }

    async getFollowers(userId) {
        const cacheKey = this.generateFollowersKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            // Use your existing function
            return await getFollowers(userId);
        }, 300);
    }

    async getFollowing(userId) {
        const cacheKey = this.generateFollowingKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            // Use your existing function
            return await getFollowing(userId);
        }, 300);
    }

    async isFollowing(followerId, followedId) {
        const cacheKey = `isFollowing:${followerId}:${followedId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            // Use your existing function
            return await isFollowing(followerId, followedId);
        }, 300);
    }

    // WRITE operations with cache invalidation
    async createUser(userData) {
        const session = await this.mongo.startSession();
        
        try {
            session.startTransaction();
            
            // Create user in MongoDB
            const user = new this.User(userData);
            const savedUser = await user.save({ session });
            
            // Use your existing Neo4j function
            await createUserReferenceInNeo4j(savedUser._id);
            
            await session.commitTransaction();
            
            // Invalidate relevant cache patterns
            await this.invalidatePattern('user:*');
            await this.invalidatePattern('user:relationships:*');
            
            console.log('User created and cache invalidated');
            return savedUser;
            
        } catch (error) {
            await session.abortTransaction();
            console.error('Error creating user:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async updateUser(userId, updateData) {
        const updatedUser = await this.User.findByIdAndUpdate(
            userId, 
            updateData, 
            { new: true, runValidators: true }
        ).lean();

        if (updatedUser) {
            // Invalidate cache for this user and related data
            await Promise.all([
                this.invalidateCache(this.generateUserKey(userId)),
                this.invalidateCache(this.generateUserRelationshipsKey(userId)),
                this.invalidateCache(this.generateFollowersKey(userId)),
                this.invalidateCache(this.generateFollowingKey(userId)),
                this.invalidatePattern(`isFollowing:${userId}:*`),
                this.invalidatePattern(`isFollowing:*:${userId}`)
            ]);
        }

        return updatedUser;
    }

    async followUser(followerId, followedId) {
        // Use your existing function
        const result = await followUser(followerId, followedId);
        
        // Invalidate cache for both users' relationships
        await Promise.all([
            this.invalidateCache(this.generateUserRelationshipsKey(followerId)),
            this.invalidateCache(this.generateUserRelationshipsKey(followedId)),
            this.invalidateCache(this.generateFollowersKey(followedId)),
            this.invalidateCache(this.generateFollowingKey(followerId)),
            this.invalidateCache(`isFollowing:${followerId}:${followedId}`)
        ]);
        
        console.log('Follow relationship created and cache invalidated');
        return result;
    }

    async unfollowUser(followerId, followedId) {
        // Use your existing function
        const result = await unfollowUser(followerId, followedId);
        
        // Invalidate cache for both users' relationships
        await Promise.all([
            this.invalidateCache(this.generateUserRelationshipsKey(followerId)),
            this.invalidateCache(this.generateUserRelationshipsKey(followedId)),
            this.invalidateCache(this.generateFollowersKey(followedId)),
            this.invalidateCache(this.generateFollowingKey(followerId)),
            this.invalidateCache(`isFollowing:${followerId}:${followedId}`)
        ]);
        
        console.log('Follow relationship removed and cache invalidated');
        return result;
    }
}

export default UserRepository;