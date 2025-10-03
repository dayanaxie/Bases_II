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

## Databases used

### Mongo
### Neo4j
### Redis

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
