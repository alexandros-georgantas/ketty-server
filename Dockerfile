FROM postgres:14

RUN apt-get update && \
    apt-get install -y openjdk-11-jdk && \
    apt-get install -y ca-certificates-java && \
    apt-get clean && \
    update-ca-certificates -f;

RUN apt-get update && apt-get install -y \
    postgresql-14-pgvector \
    && rm -rf /var/lib/apt/lists/*

FROM node:18.18.2-alpine3.18

RUN apt-get update && \
    apt-get install -y openjdk-11-jdk && \
    apt-get install -y ca-certificates-java && \
    apt-get clean && \
    update-ca-certificates -f;RUN apk add --no-cache git python3 make g++ imagemagick potrace

ENV JAVA_HOME /usr/lib/jvm/java-11-openjdk-amd64/

ENV JAVA_HOME /usr/lib/jvm/java-11-openjdk-amd64/

WORKDIR /home/node/server

COPY ./scripts/init-pgboss.sql /docker-entrypoint-initdb.d/init-pgboss.sql

COPY package.json .
COPY yarn.lock .

RUN chown -R node:node .
USER node

RUN yarn cache clean
RUN yarn install --frozen-lockfile --production=true
RUN yarn cache clean

COPY --chown=node:node . .

ENTRYPOINT ["sh", "./scripts/setupProdServer.sh"]
CMD ["node", "./startServer.js"]