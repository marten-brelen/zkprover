FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY tsconfig.json ./
COPY src ./src
COPY circuits ./circuits

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npm", "run", "start"]
