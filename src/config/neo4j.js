// neo4j.js
import neo4j from "neo4j-driver";

const neo4jConfig = {
  uri: process.env.NEO4J_URI || "bolt://neo4j1:7687",
  user: process.env.NEO4J_USER || "neo4j",
  password: process.env.NEO4J_PASSWORD || "password123",
};

// Crear el driver de Neo4j
const driver = neo4j.driver(
  neo4jConfig.uri,
  neo4j.auth.basic(neo4jConfig.user, neo4jConfig.password)
);

// Función para verificar la conexión
export const testNeo4jConnection = async () => {
  try {
    const session = driver.session();
    await session.run("RETURN 1 as test");
    await session.close();
    console.log("Conexión a Neo4j establecida correctamente");
    return true;
  } catch (error) {
    console.error("Error conectando a Neo4j:", error.message);
    return false;
  }
};

// === USER FUNCTIONS ===

// Función para crear solo la referencia en Neo4j
export const createUserReferenceInNeo4j = async (mongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `CREATE (u:User { mongoId: $mongoId }) RETURN u`,
      { mongoId: mongoId.toString() }
    );
    console.log(
      "Referencia de usuario creada en Neo4j con ID:",
      mongoId.toString()
    );
    return result;
  } catch (error) {
    console.error("Error creando referencia en Neo4j:", error.message);
    throw error;
  } finally {
    await session.close();
  }
};

// Crear relación FOLLOW entre usuarios
export const followUser = async (followerMongoId, followedMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (follower:User {mongoId: $followerMongoId}), (followed:User {mongoId: $followedMongoId})
       MERGE (follower)-[r:FOLLOWS]->(followed)
       SET r.createdAt = datetime()
       RETURN r`,
      {
        followerMongoId: followerMongoId.toString(),
        followedMongoId: followedMongoId.toString()
      }
    );
    
    console.log('Relación FOLLOW creada en Neo4j');
    return result;
  } catch (error) {
    console.error('Error creando relación FOLLOW:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

// Dejar de seguir usuario
export const unfollowUser = async (followerMongoId, followedMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (:User {mongoId: $followerMongoId})-[r:FOLLOWS]->(:User {mongoId: $followedMongoId})
       DELETE r
       RETURN count(r) as deleted`,
      {
        followerMongoId: followerMongoId.toString(),
        followedMongoId: followedMongoId.toString()
      }
    );
    
    console.log('Relación FOLLOW eliminada en Neo4j');
    return result;
  } catch (error) {
    console.error('Error eliminando relación FOLLOW:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

// Verificar si un usuario sigue a otro
export const isFollowing = async (followerMongoId, followedMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (:User {mongoId: $followerMongoId})-[r:FOLLOWS]->(:User {mongoId: $followedMongoId})
       RETURN r IS NOT NULL as isFollowing`,
      {
        followerMongoId: followerMongoId.toString(),
        followedMongoId: followedMongoId.toString()
      }
    );
    
    return result.records[0]?.get('isFollowing') || false;
  } catch (error) {
    console.error('Error verificando relación FOLLOW:', error.message);
    return false;
  } finally {
    await session.close();
  }
};

// Obtener seguidores de un usuario 
export const getFollowers = async (userMongoId) => {
  const session = driver.session();
  try { 
    const result = await session.run(
      `MATCH (follower:User)-[:FOLLOWS]->(user:User {mongoId: $userMongoId})
       RETURN follower.mongoId as followerId`,
      {
        userMongoId: userMongoId.toString()
      }
    );
    
    const followers = result.records.map(record => record.get('followerId')); 
    
    return followers;
  } catch (error) {
    console.error('Neo4j - Error obteniendo seguidores:', error.message);
    return [];
  } finally {
    await session.close();
  }
};

// Obtener usuarios seguidos
export const getFollowing = async (userMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (user:User {mongoId: $userMongoId})-[:FOLLOWS]->(followed:User)
       RETURN followed.mongoId as followedId`,
      {
        userMongoId: userMongoId.toString()
      }
    );
    
    const following = result.records.map(record => record.get('followedId')); 
    
    return following;
  } catch (error) {
    console.error('Neo4j - Error obteniendo seguidos:', error.message);
    return [];
  } finally {
    await session.close();
  }
};

// === DATASET FUNCTIONS ===

// Crear referencia de dataset en Neo4j
export const createDatasetReferenceInNeo4j = async (mongoId, title, creatorId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `CREATE (d:Dataset { mongoId: $mongoId, title: $title, creatorId: $creatorId }) 
       WITH d
       MATCH (u:User {mongoId: $creatorId})
       CREATE (u)-[:CREATED]->(d)
       RETURN d`,
      { 
        mongoId: mongoId.toString(),
        title: title,
        creatorId: creatorId.toString()
      }
    );
    console.log(
      "Referencia de dataset creada en Neo4j con ID:",
      mongoId.toString()
    );
    return result;
  } catch (error) {
    console.error("Error creando referencia de dataset en Neo4j:", error.message);
    throw error;
  } finally {
    await session.close();
  }
};

// Verificar si un usuario sigue un dataset
export const isUserFollowingDataset = async (userMongoId, datasetMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (:User {mongoId: $userMongoId})-[r:FOLLOWS]->(:Dataset {mongoId: $datasetMongoId})
       RETURN r IS NOT NULL as isFollowing`,
      {
        userMongoId: userMongoId.toString(),
        datasetMongoId: datasetMongoId.toString()
      }
    );
    
    return result.records[0]?.get('isFollowing') || false;
  } catch (error) {
    console.error('Error verificando relación FOLLOW dataset:', error.message);
    return false;
  } finally {
    await session.close();
  }
};

// Seguir dataset
export const followDataset = async (userMongoId, datasetMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {mongoId: $userMongoId}), (d:Dataset {mongoId: $datasetMongoId})
       MERGE (u)-[r:FOLLOWS]->(d)
       SET r.createdAt = datetime()
       RETURN r`,
      {
        userMongoId: userMongoId.toString(),
        datasetMongoId: datasetMongoId.toString()
      }
    );
    
    console.log('Relación FOLLOW dataset creada en Neo4j');
    return result;
  } catch (error) {
    console.error('Error creando relación FOLLOW dataset:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

// Dejar de seguir dataset
export const unfollowDataset = async (userMongoId, datasetMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (:User {mongoId: $userMongoId})-[r:FOLLOWS]->(:Dataset {mongoId: $datasetMongoId})
       DELETE r
       RETURN count(r) as deleted`,
      {
        userMongoId: userMongoId.toString(),
        datasetMongoId: datasetMongoId.toString()
      }
    );
    
    console.log('Relación FOLLOW dataset eliminada en Neo4j');
    return result;
  } catch (error) {
    console.error('Error eliminando relación FOLLOW dataset:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

// Votar por dataset
export const voteForDataset = async (userMongoId, datasetMongoId, voteType = 'like') => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {mongoId: $userMongoId}), (d:Dataset {mongoId: $datasetMongoId})
       MERGE (u)-[r:VOTED]->(d)
       SET r.type = $voteType, r.votedAt = datetime()
       RETURN r`,
      {
        userMongoId: userMongoId.toString(),
        datasetMongoId: datasetMongoId.toString(),
        voteType
      }
    );
    
    console.log('Voto para dataset registrado en Neo4j');
    return result;
  } catch (error) {
    console.error('Error votando por dataset:', error.message);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener conteo de votos para un dataset
export const getDatasetVotes = async (datasetMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (:User)-[r:VOTED]->(:Dataset {mongoId: $datasetMongoId})
       RETURN count(r) as voteCount`,
      {
        datasetMongoId: datasetMongoId.toString()
      }
    );
    
    return result.records[0]?.get('voteCount').toNumber() || 0;
  } catch (error) {
    console.error('Error obteniendo votos del dataset:', error.message);
    return 0;
  } finally {
    await session.close();
  }
};

// Obtener seguidores de un dataset
export const getDatasetFollowers = async (datasetMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (follower:User)-[:FOLLOWS]->(dataset:Dataset {mongoId: $datasetMongoId})
       RETURN follower.mongoId as followerId`,
      {
        datasetMongoId: datasetMongoId.toString()
      }
    );
    
    const followers = result.records.map(record => record.get('followerId'));
    return followers;
  } catch (error) {
    console.error('Error obteniendo seguidores del dataset:', error.message);
    return [];
  } finally {
    await session.close();
  }
};

// Obtener datasets creados por un usuario
export const getUserDatasets = async (userMongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (user:User {mongoId: $userMongoId})-[:CREATED]->(dataset:Dataset)
       RETURN dataset.mongoId as datasetId`,
      {
        userMongoId: userMongoId.toString()
      }
    );
    
    const datasets = result.records.map(record => record.get('datasetId'));
    return datasets;
  } catch (error) {
    console.error('Error obteniendo datasets del usuario:', error.message);
    return [];
  } finally {
    await session.close();
  }
};

export default driver;