FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY npm-shrinkwrap.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]