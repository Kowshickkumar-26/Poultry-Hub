package com.poultry.poultrymanagement.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;

    @GetMapping(value = {"/actuator/health", "/api/health"})
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        boolean dbHealthy = false;

        try (Connection connection = dataSource.getConnection()) {
            dbHealthy = connection.isValid(3);
        } catch (SQLException ignored) {
            dbHealthy = false;
        }

        response.put("status", dbHealthy ? "UP" : "DEGRADED");

        Map<String, Object> components = new HashMap<>();
        components.put("database", Map.of("status", dbHealthy ? "UP" : "DOWN"));
        components.put("application", Map.of("status", "UP"));
        response.put("components", components);

        return ResponseEntity.status(dbHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }
}
