FROM node:18-alpine AS builder

WORKDIR /app

COPY schedge-web/ ./

RUN npm install
RUN npm run build

FROM nginx:stable-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
