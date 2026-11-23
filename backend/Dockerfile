 
# Stage 1: Build Spring Boot application
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy Maven configuration first
COPY pom.xml .

# Download dependencies
RUN mvn -B -ntp dependency:go-offline || true

# Copy application source
COPY src ./src

# Build with retry and increasing wait times
RUN set -eu; \
    for delay in 0 60 120 240; do \
        if [ "$delay" -gt 0 ]; then \
            echo "Waiting ${delay} seconds before retry..."; \
            sleep "$delay"; \
        fi; \
        if mvn -B -ntp -Dmaven.wagon.http.retryHandler.count=3 clean package -DskipTests; then \
            exit 0; \
        fi; \
        echo "Maven build failed. Will retry if attempts remain."; \
    done; \
    echo "Build failed after all attempts."; \
    exit 1

# Stage 2: Run application
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
