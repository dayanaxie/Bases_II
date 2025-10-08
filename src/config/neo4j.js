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





// Crear relación MESSAGE entre usuarios - CORREGIDA
export const sendMessage = async (senderMongoId, receiverMongoId, content, messageId) => {
  const session = driver.session();
  try {
    console.log('📝 Creando mensaje en Neo4j:', {
      sender: senderMongoId.toString(),
      receiver: receiverMongoId.toString(),
      messageId: messageId.toString(),
      content: content
    });

    const result = await session.run(
      `MATCH (sender:User {mongoId: $senderMongoId}), (receiver:User {mongoId: $receiverMongoId})
       CREATE (sender)-[r:MESSAGE {
         messageId: $messageId,
         content: $content,
         timestamp: datetime()
       }]->(receiver)
       RETURN r`,
      {
        senderMongoId: senderMongoId.toString(),
        receiverMongoId: receiverMongoId.toString(),
        messageId: messageId.toString(),
        content: content
      }
    );
    
    console.log('✅ Mensaje creado en Neo4j - Relaciones afectadas:', result.records.length);
    return result;
  } catch (error) {
    console.error('❌ Error creando mensaje en Neo4j:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener mensajes entre dos usuarios - CORREGIDA
export const getMessagesBetweenUsers = async (user1MongoId, user2MongoId) => {
  const session = driver.session();
  try {
    console.log('🔍 Buscando mensajes entre:', user1MongoId.toString(), 'y', user2MongoId.toString());

    const result = await session.run(
      `MATCH (u1:User {mongoId: $user1MongoId})-[r:MESSAGE]-(u2:User {mongoId: $user2MongoId})
       RETURN r.messageId as messageId,
              r.content as content,
              r.timestamp as timestamp,
              startNode(r).mongoId as actualSender,
              endNode(r).mongoId as actualReceiver
       ORDER BY r.timestamp ASC`,
      {
        user1MongoId: user1MongoId.toString(),
        user2MongoId: user2MongoId.toString()
      }
    );
    
    console.log('Mensajes encontrados:', result.records.length);
    
    const messages = result.records.map(record => {
      const messageId = record.get('messageId');
      const content = record.get('content');
      const timestamp = record.get('timestamp');
      const actualSender = record.get('actualSender');
      const actualReceiver = record.get('actualReceiver');
      
      console.log('Procesando mensaje:', { messageId, actualSender, actualReceiver });
      
      return {
        _id: messageId,
        content: content,
        sender: actualSender,
        receiver: actualReceiver,
        timestamp: new Date(timestamp.toString())
      };
    });
    
    return messages;
  } catch (error) {
    console.error('❌ Error obteniendo mensajes de Neo4j:', error.message);
    console.error('Stack trace:', error.stack);
    return [];
  } finally {
    await session.close();
  }
};

// Verificar si hay mensajes entre dos usuarios - CORREGIDA
export const hasMessagesBetween = async (user1MongoId, user2MongoId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u1:User {mongoId: $user1MongoId})-[r:MESSAGE]-(u2:User {mongoId: $user2MongoId})
       RETURN count(r) > 0 as hasMessages`,
      {
        user1MongoId: user1MongoId.toString(),
        user2MongoId: user2MongoId.toString()
      }
    );
    
    const hasMessages = result.records[0]?.get('hasMessages') || false;
    console.log(`📊 ¿Hay mensajes entre ${user1MongoId} y ${user2MongoId}?`, hasMessages);
    
    return hasMessages;
  } catch (error) {
    console.error('❌ Error verificando mensajes en Neo4j:', error.message);
    return false;
  } finally {
    await session.close();
  }
};





export default driver;
