FROM node:18.18.2-alpine3.18

RUN apk add --no-cache git python3 make g++ imagemagick potrace

WORKDIR /home/node/server

COPY package.json .
COPY yarn.lock .

RUN chown -R node:node .
USER node


RUN yarn cache clean
RUN yarn install --frozen-lockfile --production=true
# RUN yarn cache clean
COPY --chown=node:node . .

FROM postgres:14

RUN apt-get update && apt-get install -y \
    postgresql-14-pgvector \
    && rm -rf /var/lib/apt/lists/*

COPY ./scripts/init-pgboss.sql /docker-entrypoint-initdb.d/init-pgboss.sql

ENTRYPOINT ["sh", "./scripts/setupProdServer.sh"]
CMD ["node", "./startServer.js"]
