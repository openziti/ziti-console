FROM node:10.3

# Create app directory
WORKDIR /usr/src/app

# Expose port
EXPOSE 1408

# Copy source code to image
COPY . .

# Fetch dependencies
RUN npm install
CMD ["node server.js"]
