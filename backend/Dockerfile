FROM node:20-bookworm-slim

WORKDIR /app

# Install openssl for Prisma and native build tools for bcrypt
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependencies and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Expose backend API port
EXPOSE 5000

# Push DB schema and start server
CMD ["sh", "-c", "npx prisma db push && npm start"]

