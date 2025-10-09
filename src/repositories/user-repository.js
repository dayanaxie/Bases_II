// user-repository.js
import BaseRepository from './base-repository.js';
import { UserQueries } from '../config/mongo-queries.js';
import { 
    followUser, 
    unfollowUser, 
    isFollowing, 
    getFollowers, 
    getFollowing,
    createUserReferenceInNeo4j 
} from '../config/neo4j.js';
import DatasetRepository from './dataset-repository.js';
import mongoose from 'mongoose';

class UserRepository extends BaseRepository {
    constructor(mongoClient, neo4jDriver) {
        super();
        this.mongo = mongoClient;
        this.neo4j = neo4jDriver;
    }

    // READ operations with caching
    async getUserById(userId) {
        const cacheKey = this.generateUserKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            return await UserQueries.findById(userId);
        }, 600);
    }

    async getUserByEmail(email) {
        const cacheKey = `user:email:${email}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await UserQueries.findByEmail(email);
        }, 600);
    }

    async getUserByUsername(username) {
        const cacheKey = `user:username:${username}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await UserQueries.findByUsername(username);
        }, 600); // 10 minutes TTL
    }

    async getAllUsers(excludeId = null) {
        const cacheKey = excludeId ? `users:all:exclude:${excludeId}` : 'users:all';
        
        return await this.cachedOperation(cacheKey, async () => {
            return await UserQueries.findAll(excludeId);
        }, 300);
    }

    async searchUsers(query) {
        const cacheKey = `users:search:${query}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await UserQueries.search(query);
        }, 300);
    }

    async getUserWithRelationships(userId) {
        const cacheKey = this.generateUserRelationshipsKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            const [user, followers, following] = await Promise.all([
                this.getUserById(userId),
                this.getFollowers(userId),
                this.getFollowing(userId)
            ]);
            
            return {
                user,
                followers,
                following
            };
        }, 300);
    }

    async getFollowers(userId) {
        const cacheKey = this.generateFollowersKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            const followerIds = await getFollowers(userId);
            if (followerIds.length === 0) return [];
            
            return await UserQueries.findByIds(followerIds);
        }, 300);
    }

    async getFollowing(userId) {
        const cacheKey = this.generateFollowingKey(userId);
        
        return await this.cachedOperation(cacheKey, async () => {
            const followingIds = await getFollowing(userId);
            if (followingIds.length === 0) return [];
            
            return await UserQueries.findByIds(followingIds);
        }, 300);
    }

    async isFollowing(followerId, followedId) {
        const cacheKey = `isFollowing:${followerId}:${followedId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await isFollowing(followerId, followedId);
        }, 300);
    }
/*
    async getUserDatasets(userId) {
        const datasetRepo = new DatasetRepository(mongoose);

        const cacheKey = `user:datasets:${userId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const datasetIds = await getUserDatasets(userId);
            if (datasetIds.length === 0) return [];
            
            // Get datasets from dataset repository
            const datasets = await Promise.all(
                datasetIds.map(id => this.datasetRepo.getDatasetById(id))
            );
            
            return datasets.filter(dataset => dataset !== null);
        }, 300);
    }
*/
    // WRITE operations with cache invalidation
    async createUser(userData) {
        // Create user in MongoDB
        const user = await UserQueries.create(userData);
        
        // Create user reference in Neo4j
        try {
            await createUserReferenceInNeo4j(user._id);
            console.log('Referencia de usuario creada en Neo4j');
        } catch (neo4jError) {
            console.error('Usuario creado en MongoDB pero falló en Neo4j:', neo4jError.message);
        }

        // Invalidate relevant cache patterns
        await Promise.all([
            this.invalidatePattern('user:*'),
            this.invalidatePattern('users:*'),
            this.invalidatePattern('user:relationships:*')
        ]);

        console.log('User created and cache invalidated');
        return user;
    }

    async updateUser(userId, updateData) {
        const updatedUser = await UserQueries.update(userId, updateData);

        if (updatedUser) {
            // Invalidate cache for this user and related data
            await Promise.all([
                this.invalidateCache(this.generateUserKey(userId)),
                this.invalidateCache(this.generateUserRelationshipsKey(userId)),
                this.invalidateCache(this.generateFollowersKey(userId)),
                this.invalidateCache(this.generateFollowingKey(userId)),
                this.invalidatePattern(`isFollowing:${userId}:*`),
                this.invalidatePattern(`isFollowing:*:${userId}`),
                this.invalidatePattern('users:all*')
            ]);
        }

        return updatedUser;
    }

    async updateUserRole(userId, tipoUsuario) {
        const updatedUser = await UserQueries.updateRole(userId, tipoUsuario);

        if (updatedUser) {
            await this.invalidatePattern(`user:${userId}*`);
            await this.invalidatePattern('users:all*');
        }

        return updatedUser;
    }

    async followUser(followerId, followedId) {
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

    async verifyUserPassword(email, password) {
        // Get user by email without cache to ensure we have latest data
        const User = mongoose.model('User');
        const user = await User.findByEmail(email);
        
        if (!user) {
            return false;
        }
        
        // Use the model's verifyPassword method
        const isValid = await user.verifyPassword(password);
        
        // Invalidate cache to ensure fresh data
        if (isValid) {
            await this.invalidateCache(this.generateUserKey(user._id));
            await this.invalidateCache(`user:email:${email}`);
        }
        
        return isValid;
    }

    async verifyPassword(user, password) {
        return await user.verifyPassword(password);
    }

    async encryptPassword(user, password) {
        return await user.encryptPassword(password);
    }
}

export default UserRepository;