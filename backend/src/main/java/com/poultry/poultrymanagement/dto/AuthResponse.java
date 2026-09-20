package com.poultry.poultrymanagement.dto;

import com.poultry.poultrymanagement.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private Role role;
}
