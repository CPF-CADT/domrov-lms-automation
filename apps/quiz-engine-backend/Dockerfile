FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "ts-node", "src/index.ts"]
EXPOSE 4001
