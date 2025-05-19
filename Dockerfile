# Bundle the site using browserify
FROM node:23-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

# Serve the site using nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY --from=0 /app/index.html ./
COPY --from=0 /app/dist ./dist/
COPY --from=0 /app/assets ./assets/

COPY --from=0 /app/.nginx /etc/nginx/conf.d/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
