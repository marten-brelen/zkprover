FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY tsconfig.json ./
COPY src ./src
# Large *.wasm / *.zkey are gitignored; CI or local build must place them here before build,
# or use a Railway volume and ZK_*_PATH outside /app/circuits.
COPY circuits ./circuits

ENV NODE_ENV=production
EXPOSE 8787

CMD ["npm", "run", "start"]
