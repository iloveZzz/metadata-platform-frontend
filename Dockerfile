FROM nginx:alpine

LABEL maintainer="yss-meta-team"
LABEL description="Metadata Platform Frontend Web UI"

# 复制自定义 Nginx 配置与静态产物
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY packages/dist /usr/share/nginx/html

EXPOSE 3100

CMD ["nginx", "-g", "daemon off;"]
