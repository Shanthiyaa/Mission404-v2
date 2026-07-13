# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app for production (Vite outputs to 'dist' folder by default)
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
