FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Run development server with host parameter to bind to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
