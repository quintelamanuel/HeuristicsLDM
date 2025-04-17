# Stage 1: Serve with Nginx
FROM nginx:alpine

# Copy built files from the build stage
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Nginx listens on port 80 by default, expose it
EXPOSE 80

# Optional: Copy a custom Nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# No need to specify CMD as the Nginx image already has one