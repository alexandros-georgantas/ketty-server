FROM node:16.19.0-alpine3.16

RUN apk add --no-cache git python3 make g++

WORKDIR /home/node/server

COPY package.json .
COPY yarn.lock .

RUN chown -R node:node .
USER node


RUN yarn install
# RUN yarn cache clean
COPY --chown=node:node . .

ENTRYPOINT ["sh", "./scripts/setupProdServer.sh"]
CMD ["node", "./startServer.js"]
