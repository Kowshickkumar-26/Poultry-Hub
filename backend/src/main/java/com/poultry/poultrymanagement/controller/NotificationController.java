package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.NotificationDto;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationDto> getNotifications(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationService.getNotifications(principal.getId(), principal.getUser().getRole());
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        notificationService.markAsRead(principal.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        notificationService.markAllAsRead(principal.getId(), principal.getUser().getRole());
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }
}
