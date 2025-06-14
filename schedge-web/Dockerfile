FROM node:18-alpine AS builder

WORKDIR /app

COPY schedge-web/ ./
ENV VITE_API_BASE_URL=""

RUN rm .env && npm install
RUN npm run build

FROM nginx:stable-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
