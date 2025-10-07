# Proyecto #1 - Bases de datos II
---
### Descripción:
**Set Sharing Site**

La tarea consiste en implementar alguna funcionalidad de un sitio para compartir datos. En general los 
usuarios deben poder ver los datos, subirlos, bajarlos, y compartirlos en la plataforma.
El grupo debe decidir en cuál base de datos se va a hacer la persistencia de cada uno de los requerimientos, 
la única regla es que tienen que usar al menos 4 base de datos distintas para hacer la tarea.
Tienen que escoger 2 de las bases de datos e instalarlas en Containers, cada una debe tener al menos 2 
nodos, así que la instalación de estas 2 no debe ser single server, si no con múltiples nodos.
Las otras 2 bases de datos pueden ser en la nube o pueden ser locales, no hay restricción.

**Requerimientos No Funcionales**
- El sistema debe ser simple de usar
- Debe guardar una coherencia en el look and feel
- La interfaz no debe ser muy elaborada

**Puntos Extra**
- Que los usuarios en sus comentarios puedan adjuntar Fotos y Videos (5 puntos)
- Que los usuarios en los mensajes que tienen con otros usuarios puedan adjuntar Fotos y Videos
(5 puntos)
- Utilizar multiples nodos y contenedores en las 4 bases de datos.

---

### Project Initialization
Use `docker-compose up -d` inside the main folder (`BASES_II`) to start the project. If the mongo1 container fails to start you can try using `docker-compose down -v` and run the command to start it again (Note: this will remove the volumes created for the container, so all data created will be lost).

### Node JS Dependencies
#### Nodemon
This dependency helps us automatically restart the node container whenever a change is detected in one of the files.

## Databases used
For this project, we decided to use three separate databases to store the data needed to fulfill the project's requirements. Here will be a diagram showing the interaction between the different databases and the web application.
![Sequence Diagram](./documentation/diagrama_secuencia.svg)

### Document Database
We decided to use a document database to store general user and dataset information, for this we used MongoDB. The Mongo Database we designed contains two main entities; Usuario contains the information needed for user authentication like username, email, password and hash and the information to be displayed on the user's profile, Dataset contains general information for the dataset as well as the download data and usuario_creador.
![Mongo Database Diagram](./documentation/diagrama_mongo.svg)
---

### Graph Database
In order to represent following, votes and creation relationships, we decided to use a graph database, for this we picked Neo4j. The Neo4j database contains two nodes; Usuario and Dataset. Here we represented following and messaging as a relation `User -> User`, the voting, creation and comment relationships are represented as a `User -> Dataset` relation.
![Mongo Database Diagram](./documentation/diagrama_neo4j_v2.svg)
---

### Redis
To store user sessions and cache, we instead used an in-memmory database, this helps us with fast queries without the need for persistency, for this we used Redis. The Redis Database is used for two purposes; User sessions and Caching. For user sessions we use a key like `session:{userId}` and we store userId, a secure token and its last access, it has a time-to-live of 3600 seconds (1 hour). For query caching we use a key like `cache:query:{query_hash}` and we store the output of the query serialized as a JSON, it has a time to live of 300 seconds (5 minutes).
![Mongo Database Diagram](./documentation/diagrama_redis.svg)

#### Initialization
For this Redis DB we are using a master node and a replica. All writes are handled by the master and all reads by the replica. For that we are using the following section of our `docker-compose.yml`.
```
  # --------------------------
  # Redis Master (Primary)
  # --------------------------
  redis-master:
    image: redis:7
    container_name: redis-master
    command: redis-server --appendonly yes --requirepass redispass
    ports:
      - "6379:6379"
    volumes:
      - redis_master_data:/data

  # --------------------------
  # Redis Replica (Secondary)
  # --------------------------
  redis-replica:
    image: redis:7
    container_name: redis-replica
    command: redis-server --appendonly yes --replicaof redis-master 6379 --requirepass redispass --masterauth redispass
    ports:
      - "6380:6379"
    depends_on:
      - redis-master
    volumes:
      - redis_replica_data:/data
```

#### Testing
After running the docker file, use the command `node src/tests/test-redis.js`. This will try to write into the cluster and then read from it.

---