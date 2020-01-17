FROM node:10.3

# Create app directory
WORKDIR /usr/src/app

# Expose port
EXPOSE 1408

# Copy source code to image
COPY . .

# Fetch dependencies
RUN yarn clean
RUN yarn 

# Build app and start server from script
CMD ["/usr/src/app/run.sh"]
