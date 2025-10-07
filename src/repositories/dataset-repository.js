// dataset-repository.js
import BaseRepository from './base-repository.js';
import mongoose from 'mongoose';

class DatasetRepository extends BaseRepository {
    constructor(mongoClient, neo4jDriver) {
        super();
        this.mongo = mongoClient;
        this.Dataset = mongoose.model('Dataset'); // Assuming you have a Dataset model
        this.neo4j = neo4jDriver;
    }

    // READ operations with caching
    async getDatasetById(datasetId) {
        const cacheKey = `dataset:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const dataset = await this.Dataset.findById(datasetId).lean();
            return dataset;
        }, 600);
    }

    async getDatasetsByUser(userId) {
        const cacheKey = `user:datasets:${userId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const datasets = await this.Dataset.find({ creator: userId }).lean();
            return datasets;
        }, 300);
    }

    async getDatasetWithSocialInfo(datasetId, userId) {
        const cacheKey = `dataset:social:${datasetId}:${userId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const [dataset, isFollowing, userVotes] = await Promise.all([
                this.getDatasetById(datasetId),
                this.isUserFollowingDataset(userId, datasetId),
                this.getUserVotesForDataset(userId, datasetId)
            ]);
            
            return {
                ...dataset,
                isFollowing,
                userVotes
            };
        }, 300);
    }

    async searchDatasets(query, filters = {}) {
        const cacheKey = this.generateQueryHash('dataset_search', { query, filters });
        
        return await this.cachedOperation(cacheKey, async () => {
            const searchCriteria = {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $in: [new RegExp(query, 'i')] } }
                ]
            };
            
            const datasets = await this.Dataset.find(searchCriteria).lean();
            return datasets;
        }, 300);
    }

    // Dataset social interactions
    async isUserFollowingDataset(userId, datasetId) {
        const cacheKey = `userFollowsDataset:${userId}:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const session = this.neo4j.session();
            try {
                const result = await session.run(
                    `MATCH (:User {mongoId: $userId})-[r:FOLLOWS]->(:Dataset {mongoId: $datasetId})
                     RETURN r IS NOT NULL as isFollowing`,
                    {
                        userId: userId.toString(),
                        datasetId: datasetId.toString()
                    }
                );
                
                return result.records[0]?.get('isFollowing') || false;
            } finally {
                await session.close();
            }
        }, 300);
    }

    async getUserVotesForDataset(userId, datasetId) {
        const cacheKey = `userVotes:${userId}:${datasetId}`;
        
        return await this.cachedOperation(cacheKey, async () => {
            const session = this.neo4j.session();
            try {
                const result = await session.run(
                    `MATCH (:User {mongoId: $userId})-[r:VOTED]->(:Dataset {mongoId: $datasetId})
                     RETURN count(r) as voteCount`,
                    {
                        userId: userId.toString(),
                        datasetId: datasetId.toString()
                    }
                );
                
                return result.records[0]?.get('voteCount').toNumber() || 0;
            } finally {
                await session.close();
            }
        }, 300);
    }

    // WRITE operations with cache invalidation
    async createDataset(datasetData, creatorId) {
        const session = await this.mongo.startSession();
        
        try {
            session.startTransaction();
            
            // Create dataset in MongoDB
            const dataset = new this.Dataset({
                ...datasetData,
                creator: creatorId
            });
            const savedDataset = await dataset.save({ session });
            
            // Create dataset reference in Neo4j
            const neo4jSession = this.neo4j.session();
            try {
                await neo4jSession.run(
                    `CREATE (d:Dataset { mongoId: $mongoId, title: $title, creatorId: $creatorId }) 
                     WITH d
                     MATCH (u:User {mongoId: $creatorId})
                     CREATE (u)-[:CREATED]->(d)`,
                    { 
                        mongoId: savedDataset._id.toString(),
                        title: savedDataset.title,
                        creatorId: creatorId.toString()
                    }
                );
            } finally {
                await neo4jSession.close();
            }
            
            await session.commitTransaction();
            
            // Invalidate relevant cache
            await Promise.all([
                this.invalidatePattern('dataset:*'),
                this.invalidatePattern(`user:datasets:${creatorId}`),
                this.invalidatePattern('*dataset_search*')
            ]);
            
            console.log('Dataset created and cache invalidated');
            return savedDataset;
            
        } catch (error) {
            await session.abortTransaction();
            console.error('Error creating dataset:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async updateDataset(datasetId, updateData) {
        const updatedDataset = await this.Dataset.findByIdAndUpdate(
            datasetId, 
            updateData, 
            { new: true, runValidators: true }
        ).lean();

        if (updatedDataset) {
            // Invalidate all cache related to this dataset
            await Promise.all([
                this.invalidateCache(`dataset:${datasetId}`),
                this.invalidatePattern(`dataset:social:${datasetId}:*`),
                this.invalidatePattern(`userFollowsDataset:*:${datasetId}`),
                this.invalidatePattern(`userVotes:*:${datasetId}`),
                this.invalidatePattern('*dataset_search*')
            ]);
        }

        return updatedDataset;
    }

    async followDataset(userId, datasetId) {
        const session = this.neo4j.session();
        
        try {
            const result = await session.run(
                `MATCH (u:User {mongoId: $userId}), (d:Dataset {mongoId: $datasetId})
                 MERGE (u)-[r:FOLLOWS]->(d)
                 SET r.createdAt = datetime()
                 RETURN r`,
                {
                    userId: userId.toString(),
                    datasetId: datasetId.toString()
                }
            );
            
            // Invalidate relevant cache
            await Promise.all([
                this.invalidateCache(`dataset:social:${datasetId}:${userId}`),
                this.invalidateCache(`userFollowsDataset:${userId}:${datasetId}`),
                this.invalidatePattern(`user:datasets:${userId}`)
            ]);
            
            console.log('Dataset follow relationship created and cache invalidated');
            return result;
            
        } catch (error) {
            console.error('Error following dataset:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    async voteForDataset(userId, datasetId, voteType = 'like') {
        const session = this.neo4j.session();
        
        try {
            const result = await session.run(
                `MATCH (u:User {mongoId: $userId}), (d:Dataset {mongoId: $datasetId})
                 MERGE (u)-[r:VOTED]->(d)
                 SET r.type = $voteType, r.votedAt = datetime()
                 RETURN r`,
                {
                    userId: userId.toString(),
                    datasetId: datasetId.toString(),
                    voteType
                }
            );
            
            // Invalidate relevant cache
            await Promise.all([
                this.invalidateCache(`dataset:social:${datasetId}:${userId}`),
                this.invalidateCache(`userVotes:${userId}:${datasetId}`),
                this.invalidatePattern(`dataset:${datasetId}`)
            ]);
            
            console.log('Dataset vote recorded and cache invalidated');
            return result;
            
        } catch (error) {
            console.error('Error voting for dataset:', error);
            throw error;
        } finally {
            await session.close();
        }
    }
}

export default DatasetRepository;