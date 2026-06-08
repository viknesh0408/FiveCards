# Stage 1: Build the React Application
FROM node:23-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Spring Boot Application
FROM eclipse-temurin:21-jdk-jammy AS backend-builder
WORKDIR /app
COPY backend/ .
# Copy compiled frontend static assets into backend static resources
COPY --from=frontend-builder /frontend/dist/ ./src/main/resources/static/
RUN chmod +x gradlew
RUN ./gradlew bootJar --no-daemon

# Stage 3: Run Stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=backend-builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
