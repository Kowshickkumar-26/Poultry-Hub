package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.UserProfileResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    // GET /api/users/me
    // Requires a valid Bearer token. Spring Security resolves the token
    // into the currently authenticated UserPrincipal automatically.
    @GetMapping("/api/users/me")
    public UserProfileResponse getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        return UserProfileResponse.builder()
                .id(principal.getId())
                .name(principal.getUser().getName())
                .email(principal.getUsername())
                .phone(principal.getUser().getPhone())
                .role(principal.getUser().getRole())
                .isActive(principal.getUser().getIsActive())
                .createdAt(principal.getUser().getCreatedAt())
                .build();
    }
}
