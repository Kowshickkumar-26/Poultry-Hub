# syntax=docker/dockerfile:1

# =======================================================
# Stage 1: Build Spring Boot executable JAR
# =======================================================
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

# Configure Maven Central mirror (Google Cloud Storage mirror)
# to avoid HTTP 429 rate limiting from Maven Central on shared cloud build IPs
COPY settings.xml /root/.m2/settings.xml
COPY settings.xml .
COPY pom.xml .

# Download dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn -s settings.xml -B -ntp dependency:resolve

# Copy application source code
COPY src ./src

# Build production executable JAR (skipping test suite)
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn -s settings.xml -B -ntp package -DskipTests

# =======================================================
# Stage 2: Minimal Java 21 JRE runtime image
# =======================================================
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the built jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Render dynamic port exposure (defaults to 8080 if not set)
ENV PORT=8080
EXPOSE 8080

# Container-aware JVM memory settings for Render Free tier (512MB RAM)
# 65% max heap (~330MB), leaving ~180MB for Metaspace, threads, and OS
ENTRYPOINT ["sh", "-c", "java -XX:+UseContainerSupport -XX:MaxRAMPercentage=65.0 -XX:InitialRAMPercentage=40.0 -XX:+ExitOnOutOfMemoryError -Dserver.port=${PORT:-8080} -jar app.jar"]
