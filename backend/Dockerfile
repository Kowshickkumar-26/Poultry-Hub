
FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

 RUN for attempt in 1 2 3 4 5; do \
      mvn -B clean package -DskipTests && exit 0; \
      echo "Maven download failed. Retrying in 30 seconds..."; \
      sleep 30; \
    done; \
    exit 1
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
