FROM node:18-alpine

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto que usa tu app (ajusta según tu app)
EXPOSE 3000

# El comando importante - apuntar a app.js
CMD ["npm", "start"]
