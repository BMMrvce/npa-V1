FROM denoland/deno:alpine-1.44.4

WORKDIR /app

# Copy backend files
COPY backend/ /app/

# Cache dependencies
RUN deno cache -A index.ts

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080

# Run the server
CMD ["run", "-A", "index.ts"]
