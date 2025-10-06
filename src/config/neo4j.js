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
    console.log("✅ Conexión a Neo4j establecida correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error conectando a Neo4j:", error.message);
    return false;
  }
};

// Función para crear solo la referencia en Neo4j
export const createUserReferenceInNeo4j = async (mongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `CREATE (u:User { mongoId: $mongoId }) RETURN u`,
      { mongoId: mongoId.toString() }
    );
    console.log(
      "✅ Referencia de usuario creada en Neo4j con ID:",
      mongoId.toString()
    );
    return result;
  } catch (error) {
    console.error("❌ Error creando referencia en Neo4j:", error.message);
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
    
    console.log('✅ Relación FOLLOW creada en Neo4j');
    return result;
  } catch (error) {
    console.error('❌ Error creando relación FOLLOW:', error.message);
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
    
    console.log('✅ Relación FOLLOW eliminada en Neo4j');
    return result;
  } catch (error) {
    console.error('❌ Error eliminando relación FOLLOW:', error.message);
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
    console.error('❌ Error verificando relación FOLLOW:', error.message);
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
    console.error('❌ Neo4j - Error obteniendo seguidores:', error.message);
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
    console.error('❌ Neo4j - Error obteniendo seguidos:', error.message);
    return [];
  } finally {
    await session.close();
  }
};


export default driver;
