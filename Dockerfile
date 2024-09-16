FROM node:14-alpine

WORKDIR /app

COPY . .

EXPOSE 3000
EXPOSE 3001

CMD ["node", "index.js"]
