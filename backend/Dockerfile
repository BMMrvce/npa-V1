FROM denoland/deno:alpine-1.44.4

WORKDIR /app

# Copy backend files
COPY backend/ /app/

# Cache dependencies
RUN deno cache -A index.ts

# Expose port
EXPOSE 8000

# Set environment variables
ENV PORT=8000

# Run the server
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "index.ts"]
