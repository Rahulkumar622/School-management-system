FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

RUN npm install

COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json backend/

RUN npm --prefix backend install

COPY backend ./backend
COPY --from=build /app/frontend/build ./frontend/build

EXPOSE 5000

CMD ["npm", "--prefix", "backend", "start"]
