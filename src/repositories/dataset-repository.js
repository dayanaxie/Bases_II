// dataset-repository.js
import BaseRepository from './base-repository.js';
import { DatasetQueries } from '../config/mongo-queries.js';
import { 
  createDatasetReferenceInNeo4j,
  createComment,
  getDatasetComments,
  hideComment,
  createOrUpdateVote,
  getUserVote,
  getDatasetVotes,
  removeVote,
  createReply,
  getCommentReplies,
  getDatasetCommentsWithReplies,
  hideReply
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
            let voteCount = 0;
            
            if (userId) {
                [voteCount] = await Promise.all([
                    this.getDatasetVotes(datasetId)
                ]);
            } else {
                [voteCount] = await Promise.all([
                    this.getDatasetVotes(datasetId)
                ]);
            }
            
            return {
                ...dataset.toObject(),
                voteCount
            };
        }, 300);
    }

    async getDatasetVotes(datasetId) {
        const cacheKey = `dataset:votes:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await getDatasetVotes(datasetId);
        }, 300);
    }

    // COMMENTS operations
    async getDatasetComments(datasetId) {
        const cacheKey = `dataset:comments:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await getDatasetComments(datasetId);
        }, 300);
    }

    async getDatasetCommentsWithReplies(datasetId) {
        const cacheKey = `dataset:comments:replies:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await getDatasetCommentsWithReplies(datasetId);
        }, 300);
    }

    async getCommentReplies(commentId, datasetId) {
        const cacheKey = `comment:replies:${commentId}:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await getCommentReplies(commentId, datasetId);
        }, 300);
    }

    async createComment(userId, datasetId, content) {
        const comment = await createComment(userId, datasetId, content);
        
        // Invalidate comments cache
        await Promise.all([
            this.invalidateCache(`dataset:comments:${datasetId}`),
            this.invalidateCache(`dataset:comments:replies:${datasetId}`)
        ]);
        
        console.log('✅ Comment created and cache invalidated');
        return comment;
    }

    async createReply(userId, commentId, content, datasetId) {
        const reply = await createReply(userId, commentId, content, datasetId);
        
        // Invalidate comments and replies cache
        await Promise.all([
            this.invalidateCache(`dataset:comments:${datasetId}`),
            this.invalidateCache(`dataset:comments:replies:${datasetId}`),
            this.invalidateCache(`comment:replies:${commentId}:${datasetId}`)
        ]);
        
        console.log('✅ Reply created and cache invalidated');
        return reply;
    }

    async hideComment(commentId) {
        await hideComment(commentId);
        
        // Note: We can't easily invalidate specific dataset caches here
        // so we'll invalidate all comment-related patterns
        await this.invalidatePattern('dataset:comments:*');
        await this.invalidatePattern('dataset:comments:replies:*');
        await this.invalidatePattern('comment:replies:*');
        
        console.log('✅ Comment hidden and cache invalidated');
    }

    async hideReply(replyId) {
        await hideReply(replyId);
        
        // Invalidate all reply-related caches
        await this.invalidatePattern('dataset:comments:replies:*');
        await this.invalidatePattern('comment:replies:*');
        
        console.log('✅ Reply hidden and cache invalidated');
    }

    // VOTES operations
    async getUserVote(userId, datasetId) {
        const cacheKey = `user:vote:${userId}:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            return await getUserVote(userId, datasetId);
        }, 300);
    }

    async createOrUpdateVote(userId, datasetId, voteType) {
        const vote = await createOrUpdateVote(userId, datasetId, voteType);
        
        // Invalidate relevant cache
        await Promise.all([
            this.invalidateCache(`dataset:social:${datasetId}:${userId}`),
            this.invalidateCache(`dataset:votes:${datasetId}`),
            this.invalidateCache(`user:vote:${userId}:${datasetId}`)
        ]);
        
        console.log('✅ Dataset vote recorded and cache invalidated');
        return vote;
    }

    async removeVote(userId, datasetId) {
        await removeVote(userId, datasetId);
        
        // Invalidate relevant cache
        await Promise.all([
            this.invalidateCache(`dataset:social:${datasetId}:${userId}`),
            this.invalidateCache(`dataset:votes:${datasetId}`),
            this.invalidateCache(`user:vote:${userId}:${datasetId}`)
        ]);
        
        console.log('✅ Vote removed and cache invalidated');
    }

    // WRITE operations with cache invalidation
    async createDataset(datasetData) {
        const dataset = await DatasetQueries.create(datasetData);

        // Create dataset reference in Neo4j using abstracted function
        try {
            await createDatasetReferenceInNeo4j(
                dataset._id, 
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
}

export default DatasetRepository;