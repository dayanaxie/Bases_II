// dataset-repository.js
import BaseRepository from './base-repository.js';
import { DatasetQueries } from './mongo-queries.js';
import { 
  createDatasetReferenceInNeo4j,
  isUserFollowingDataset,
  followDataset,
  unfollowDataset,
  voteForDataset,
  getDatasetVotes,
  getDatasetFollowers,
  getUserDatasets
} from '../config/neo4j.js';

class DatasetRepository extends BaseRepository {
    constructor(mongoClient, neo4jDriver) {
        super();
        this.mongo = mongoClient;
        this.neo4j = neo4jDriver;
    }

    // READ operations with caching
    async getDatasetById(datasetId) {
        const cacheKey = `dataset:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await DatasetQueries.findById(datasetId);
        }, 600);
    }

    async getAllDatasets() {
        const cacheKey = 'datasets:all';
        
        return await this.cachedOperation(cacheKey, async () => {
            return await DatasetQueries.findAll();
        }, 300);
    }

    async getApprovedDatasets() {
        const cacheKey = 'datasets:approved';
        
        return await this.cachedOperation(cacheKey, async () => {
            return await DatasetQueries.findApproved();
        }, 300);
    }

    async getDatasetWithSocialInfo(datasetId, userId) {
        const cacheKey = `dataset:social:${datasetId}:${userId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const dataset = await this.getDatasetById(datasetId);
            let isFollowing = false;
            let voteCount = 0;
            let followers = [];
            
            if (userId) {
                [isFollowing, voteCount, followers] = await Promise.all([
                    this.isUserFollowingDataset(userId, datasetId),
                    this.getDatasetVotes(datasetId),
                    this.getDatasetFollowers(datasetId)
                ]);
            } else {
                [voteCount, followers] = await Promise.all([
                    this.getDatasetVotes(datasetId),
                    this.getDatasetFollowers(datasetId)
                ]);
            }
            
            return {
                ...dataset.toObject(),
                isFollowing,
                voteCount,
                followersCount: followers.length
            };
        }, 300);
    }

    async isUserFollowingDataset(userId, datasetId) {
        const cacheKey = `userFollowsDataset:${userId}:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await isUserFollowingDataset(userId, datasetId);
        }, 300);
    }

    async getDatasetVotes(datasetId) {
        const cacheKey = `dataset:votes:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await getDatasetVotes(datasetId);
        }, 300);
    }

    async getDatasetFollowers(datasetId) {
        const cacheKey = `dataset:followers:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await getDatasetFollowers(datasetId);
        }, 300);
    }

    async getUserDatasets(userId) {
        const cacheKey = `user:datasets:${userId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const datasetIds = await getUserDatasets(userId);
            if (datasetIds.length === 0) return [];
            
            // Get full dataset data from MongoDB
            const datasets = await Promise.all(
                datasetIds.map(id => this.getDatasetById(id))
            );
            
            return datasets.filter(dataset => dataset !== null);
        }, 300);
    }

    // WRITE operations with cache invalidation
    async createDataset(datasetData) {
        const dataset = await DatasetQueries.create(datasetData);

        // Create dataset reference in Neo4j using abstracted function
        try {
            await createDatasetReferenceInNeo4j(
                dataset._id, 
                dataset.nombre, 
                dataset.creadorId
            );
        } catch (error) {
            console.error('⚠️ Dataset creado en MongoDB pero falló en Neo4j:', error.message);
            // Continue even if Neo4j fails
        }

        // Invalidate relevant cache
        await Promise.all([
            this.invalidatePattern('dataset:*'),
            this.invalidatePattern('datasets:*'),
            this.invalidatePattern(`user:datasets:${dataset.creadorId}`)
        ]);

        console.log('✅ Dataset created and cache invalidated');
        return dataset;
    }

    async updateDataset(datasetId, updateData) {
        const updatedDataset = await DatasetQueries.update(datasetId, updateData);

        if (updatedDataset) {
            // Invalidate all cache related to this dataset
            await Promise.all([
                this.invalidateCache(`dataset:${datasetId}`),
                this.invalidatePattern(`dataset:social:${datasetId}:*`),
                this.invalidatePattern(`userFollowsDataset:*:${datasetId}`),
                this.invalidatePattern(`dataset:votes:${datasetId}`),
                this.invalidatePattern(`dataset:followers:${datasetId}`),
                this.invalidatePattern('datasets:*')
            ]);
        }

        return updatedDataset;
    }

    async updateDatasetState(datasetId, estado) {
        const updatedDataset = await DatasetQueries.updateState(datasetId, estado);

        if (updatedDataset) {
            await Promise.all([
                this.invalidateCache(`dataset:${datasetId}`),
                this.invalidatePattern('datasets:*')
            ]);
        }

        return updatedDataset;
    }

    async incrementDownloads(datasetId) {
        const updatedDataset = await DatasetQueries.incrementDownloads(datasetId);

        if (updatedDataset) {
            await this.invalidateCache(`dataset:${datasetId}`);
        }

        return updatedDataset;
    }

    async followDataset(userId, datasetId) {
        const result = await followDataset(userId, datasetId);
        
        // Invalidate relevant cache
        await Promise.all([
            this.invalidateCache(`dataset:social:${datasetId}:${userId}`),
            this.invalidateCache(`userFollowsDataset:${userId}:${datasetId}`),
            this.invalidateCache(`dataset:followers:${datasetId}`)
        ]);
        
        console.log('✅ Dataset follow relationship created and cache invalidated');
        return result;
    }

    async unfollowDataset(userId, datasetId) {
        const result = await unfollowDataset(userId, datasetId);
        
        // Invalidate relevant cache
        await Promise.all([
            this.invalidateCache(`dataset:social:${datasetId}:${userId}`),
            this.invalidateCache(`userFollowsDataset:${userId}:${datasetId}`),
            this.invalidateCache(`dataset:followers:${datasetId}`)
        ]);
        
        console.log('✅ Dataset unfollow relationship created and cache invalidated');
        return result;
    }

    async voteForDataset(userId, datasetId, voteType = 'like') {
        const result = await voteForDataset(userId, datasetId, voteType);
        
        // Invalidate relevant cache
        await Promise.all([
            this.invalidateCache(`dataset:social:${datasetId}:${userId}`),
            this.invalidateCache(`dataset:votes:${datasetId}`)
        ]);
        
        console.log('✅ Dataset vote recorded and cache invalidated');
        return result;
    }
}

export default DatasetRepository;