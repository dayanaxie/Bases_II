FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar dependencias primero
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código
COPY . .

# Exponer el puerto que usa tu app
EXPOSE 3000

# Comando por defecto (puede ser sobrescrito en docker-compose)
CMD ["npm", "run", "dev"]
