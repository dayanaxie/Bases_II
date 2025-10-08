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
export const createUserReferenceInNeo4j = async (userId) => {
  const session = driver.session();
  try {
    // Usar MERGE en lugar de CREATE para evitar duplicados
    const result = await session.run(
      `MERGE (u:User {mongoId: $userId})
       ON CREATE SET u.createdAt = datetime()
       RETURN u.mongoId as userId`,
      {
        userId: userId.toString()
      }
    );

    console.log('✅ Referencia de usuario creada/verificada en Neo4j');
    return result.records[0];
  } catch (error) {
    console.error('Error creando referencia de usuario en Neo4j:', error);
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




// Crear referencia de dataset en Neo4j con relación CREATE
export const createDatasetReferenceInNeo4j = async (datasetId, creatorId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {mongoId: $creatorId})
       CREATE (u)-[r:CREATED]->(d:Dataset {
         mongoId: $datasetId,
         createdAt: datetime()
       })
       RETURN d.mongoId as datasetId, r.createdAt as createdAt`,
      {
        datasetId: datasetId.toString(),
        creatorId: creatorId.toString()
      }
    );

    console.log('✅ Referencia de dataset creada en Neo4j con relación CREATE');
    return result.records[0];
  } catch (error) {
    console.error('Error creando referencia de dataset en Neo4j:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Verificar si existe un dataset en Neo4j
export const datasetExistsInNeo4j = async (datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (d:Dataset {mongoId: $datasetId}) RETURN d.mongoId as datasetId`,
      {
        datasetId: datasetId.toString()
      }
    );

    return result.records.length > 0;
  } catch (error) {
    console.error('Error verificando dataset en Neo4j:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener creador de un dataset
export const getDatasetCreator = async (datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)-[:CREATED]->(d:Dataset {mongoId: $datasetId})
       RETURN u.mongoId as creatorId`,
      {
        datasetId: datasetId.toString()
      }
    );

    if (result.records.length > 0) {
      return result.records[0].get('creatorId');
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo creador del dataset:', error);
    throw error;
  } finally {
    await session.close();
  }
};




// Crear comentario en un dataset
export const createComment = async (userId, datasetId, content) => {
  const session = driver.session();
  try {
    const commentId = new Date().getTime().toString();
    const now = new Date();
    
    const result = await session.run(
      `MATCH (u:User {mongoId: $userId}), (d:Dataset {mongoId: $datasetId})
       CREATE (u)-[:WROTE]->(c:Comment {
         commentId: $commentId,
         content: $content,
         timestamp: datetime($timestamp),
         hidden: false,
         datasetId: $datasetId
       })-[:ON_DATASET]->(d)
       RETURN c.commentId as commentId, c.timestamp as timestamp`,
      {
        userId: userId.toString(),
        datasetId: datasetId.toString(),
        commentId: commentId,
        content: content,
        timestamp: now.toISOString()
      }
    );

    if (result.records.length > 0) {
      const record = result.records[0];
      return {
        commentId: record.get('commentId'),
        timestamp: now
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error creando comentario:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener comentarios de un dataset
export const getDatasetComments = async (datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)-[:WROTE]->(c:Comment)-[:ON_DATASET]->(d:Dataset {mongoId: $datasetId})
       WHERE c.hidden = false
       RETURN u.mongoId as userId, c.content as content, 
              toString(c.timestamp) as timestampString, c.commentId as commentId
       ORDER BY c.timestamp DESC`,
      {
        datasetId: datasetId.toString()
      }
    );

    const comments = result.records.map(record => {
      const timestampString = record.get('timestampString');
      
      let jsDate;
      if (timestampString) {
        jsDate = new Date(timestampString);
        if (isNaN(jsDate.getTime())) {
          console.warn('No se pudo parsear la fecha:', timestampString);
          jsDate = new Date();
        }
      } else {
        jsDate = new Date();
      }

      return {
        userId: record.get('userId'),
        content: record.get('content'),
        timestamp: jsDate,
        commentId: record.get('commentId')
      };
    });

    return comments;
  } catch (error) {
    console.error('Error obteniendo comentarios:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Ocultar comentario (para admin)
export const hideComment = async (commentId) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (c:Comment {commentId: $commentId})
       SET c.hidden = true`,
      {
        commentId: commentId
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error ocultando comentario:', error);
    throw error;
  } finally {
    await session.close();
  }
};




// Crear o actualizar voto en un dataset
export const createOrUpdateVote = async (userId, datasetId, voteType) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {mongoId: $userId}), (d:Dataset {mongoId: $datasetId})
       MERGE (u)-[r:VOTED]->(d)
       SET r.voteType = $voteType, r.timestamp = datetime()
       RETURN r.voteType as voteType, r.timestamp as timestamp`,
      {
        userId: userId.toString(),
        datasetId: datasetId.toString(),
        voteType: voteType
      }
    );

    if (result.records.length > 0) {
      const record = result.records[0];
      const timestampString = record.get('timestamp');
      return {
        voteType: record.get('voteType'),
        timestamp: new Date(timestampString.toString())
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error creando/actualizando voto:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener voto de un usuario específico en un dataset
export const getUserVote = async (userId, datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {mongoId: $userId})-[r:VOTED]->(d:Dataset {mongoId: $datasetId})
       RETURN r.voteType as voteType, toString(r.timestamp) as timestampString`,
      {
        userId: userId.toString(),
        datasetId: datasetId.toString()
      }
    );

    if (result.records.length > 0) {
      const record = result.records[0];
      const timestampString = record.get('timestampString');
      let jsDate = new Date();
      
      if (timestampString) {
        jsDate = new Date(timestampString);
        if (isNaN(jsDate.getTime())) {
          jsDate = new Date();
        }
      }

      return {
        voteType: record.get('voteType'),
        timestamp: jsDate
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo voto del usuario:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener todos los votos de un dataset
export const getDatasetVotes = async (datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)-[r:VOTED]->(d:Dataset {mongoId: $datasetId})
       RETURN u.mongoId as userId, r.voteType as voteType, 
              toString(r.timestamp) as timestampString
       ORDER BY r.timestamp DESC`,
      {
        datasetId: datasetId.toString()
      }
    );

    const votes = result.records.map(record => {
      const timestampString = record.get('timestampString');
      let jsDate = new Date();
      
      if (timestampString) {
        jsDate = new Date(timestampString);
        if (isNaN(jsDate.getTime())) {
          jsDate = new Date();
        }
      }

      return {
        userId: record.get('userId'),
        voteType: record.get('voteType'),
        timestamp: jsDate
      };
    });

    return votes;
  } catch (error) {
    console.error('Error obteniendo votos:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Eliminar voto de un usuario
export const removeVote = async (userId, datasetId) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (:User {mongoId: $userId})-[r:VOTED]->(:Dataset {mongoId: $datasetId})
       DELETE r`,
      {
        userId: userId.toString(),
        datasetId: datasetId.toString()
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error eliminando voto:', error);
    throw error;
  } finally {
    await session.close();
  }
};


// Crear respuesta a un comentario
export const createReply = async (userId, commentId, content, datasetId) => {
  const session = driver.session();
  try {
    const replyId = new Date().getTime().toString() + Math.random().toString(36).substr(2, 5);
    const now = new Date();
    
    const result = await session.run(
      `MATCH (u:User {mongoId: $userId}), 
            (parentComment:Comment {commentId: $commentId})
       CREATE (u)-[:WROTE]->(r:Comment {
         commentId: $replyId,
         content: $content,
         timestamp: datetime($timestamp),
         hidden: false,
         datasetId: $datasetId,
         isReply: true,
         parentCommentId: $commentId
       })-[:REPLY_TO]->(parentComment)
       RETURN r.commentId as replyId, r.timestamp as timestamp`,
      {
        userId: userId.toString(),
        commentId: commentId,
        datasetId: datasetId.toString(),
        replyId: replyId,
        content: content,
        timestamp: now.toISOString()
      }
    );

    if (result.records.length > 0) {
      const record = result.records[0];
      return {
        replyId: record.get('replyId'),
        timestamp: now
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error creando respuesta:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener respuestas de un comentario
export const getCommentReplies = async (commentId, datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)-[:WROTE]->(r:Comment)-[:REPLY_TO]->(parent:Comment {commentId: $commentId})
       WHERE r.hidden = false AND r.datasetId = $datasetId
       RETURN u.mongoId as userId, r.content as content, 
              toString(r.timestamp) as timestampString, 
              r.commentId as replyId
       ORDER BY r.timestamp ASC`,
      {
        commentId: commentId,
        datasetId: datasetId.toString()
      }
    );

    const replies = result.records.map(record => {
      const timestampString = record.get('timestampString');
      let jsDate = new Date();
      
      if (timestampString) {
        jsDate = new Date(timestampString);
        if (isNaN(jsDate.getTime())) {
          jsDate = new Date();
        }
      }

      return {
        userId: record.get('userId'),
        content: record.get('content'),
        timestamp: jsDate,
        replyId: record.get('replyId')
      };
    });

    return replies;
  } catch (error) {
    console.error('Error obteniendo respuestas:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Obtener comentarios con sus respuestas
export const getDatasetCommentsWithReplies = async (datasetId) => {
  try {
    // Primero obtener los comentarios principales ordenados
    const commentsResult = await getCommentsMain(datasetId);
    
    const commentsWithReplies = await Promise.all(
      commentsResult.map(async (comment) => {
        // Obtener respuestas para este comentario específico con nueva sesión
        const replies = await getCommentRepliesWithNewSession(comment.commentId, datasetId);
        
        return {
          userId: comment.userId,
          content: comment.content,
          timestamp: comment.timestamp,
          commentId: comment.commentId,
          replies: replies
        };
      })
    );

    // Filtrar comentarios nulos
    return commentsWithReplies.filter(comment => comment !== null);
  } catch (error) {
    console.error('Error obteniendo comentarios con respuestas:', error);
    throw error;
  }
};

// Ocultar respuesta (para admin) - CORREGIDO
export const hideReply = async (replyId) => {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (r:Comment {commentId: $replyId})
       SET r.hidden = true`,
      {
        replyId: replyId
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error ocultando respuesta:', error);
    throw error;
  } finally {
    await session.close();
  }
};



// Función auxiliar para obtener comentarios principales
const getCommentsMain = async (datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)-[:WROTE]->(c:Comment)-[:ON_DATASET]->(d:Dataset {mongoId: $datasetId})
       WHERE c.hidden = false AND NOT exists(c.isReply)
       RETURN u.mongoId as commentUserId, 
              c.content as commentContent, 
              toString(c.timestamp) as commentTimestamp,
              c.commentId as commentId
       ORDER BY c.timestamp DESC`,
      {
        datasetId: datasetId.toString()
      }
    );

    return result.records.map(record => {
      const commentTimestamp = record.get('commentTimestamp');
      let commentDate = new Date();
      
      if (commentTimestamp) {
        commentDate = new Date(commentTimestamp);
        if (isNaN(commentDate.getTime())) {
          commentDate = new Date();
        }
      }

      // Validar que el comentario tenga datos válidos
      const commentUserId = record.get('commentUserId');
      const commentContent = record.get('commentContent');
      
      if (!commentUserId || !commentContent) {
        console.warn('Comentario con datos inválidos encontrado:', { 
          commentId: record.get('commentId'), 
          commentUserId, 
          commentContent 
        });
        return null;
      }

      return {
        userId: commentUserId,
        content: commentContent,
        timestamp: commentDate,
        commentId: record.get('commentId')
      };
    }).filter(comment => comment !== null);
  } catch (error) {
    console.error('Error obteniendo comentarios principales:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// Función auxiliar para obtener respuestas con nueva sesión
const getCommentRepliesWithNewSession = async (commentId, datasetId) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (replyUser:User)-[:WROTE]->(r:Comment)-[:REPLY_TO]->(c:Comment {commentId: $commentId})
       WHERE r.hidden = false AND r.content IS NOT NULL AND r.datasetId = $datasetId
       RETURN replyUser.mongoId as replyUserId, 
              r.content as replyContent, 
              toString(r.timestamp) as replyTimestamp,
              r.commentId as replyId
       ORDER BY r.timestamp ASC`,
      {
        commentId: commentId,
        datasetId: datasetId.toString()
      }
    );

    const replies = result.records.map(replyRecord => {
      const replyUserId = replyRecord.get('replyUserId');
      const replyContent = replyRecord.get('replyContent');
      const replyTimestamp = replyRecord.get('replyTimestamp');
      const replyId = replyRecord.get('replyId');

      // Validar que la respuesta tenga datos válidos
      if (!replyUserId || !replyContent) {
        console.warn('Respuesta con datos inválidos encontrada:', { replyId, replyUserId, replyContent });
        return null;
      }

      let replyDate = new Date();
      if (replyTimestamp) {
        replyDate = new Date(replyTimestamp);
        if (isNaN(replyDate.getTime())) {
          replyDate = new Date();
        }
      }

      return {
        userId: replyUserId,
        content: replyContent,
        timestamp: replyDate,
        replyId: replyId
      };
    }).filter(reply => reply !== null); // Filtrar respuestas nulas

    return replies;
  } catch (error) {
    console.error(`Error obteniendo respuestas para comentario ${commentId}:`, error);
    return []; // Retornar array vacío en caso de error
  } finally {
    await session.close();
  }
};



export default driver;
