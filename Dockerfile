FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV HOST=0.0.0.0 PORT=3001 DB_PATH=/data/rozgarlink.sqlite COOKIE_SECURE=true
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["npm", "start"]
