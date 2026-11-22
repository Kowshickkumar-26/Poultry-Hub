package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.AuthResponse;
import com.poultry.poultrymanagement.dto.LoginRequest;
import com.poultry.poultrymanagement.dto.RegisterRequest;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.User;
import com.poultry.poultrymanagement.repository.UserRepository;
import com.poultry.poultrymanagement.security.JwtService;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.FarmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final FarmService farmService;

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        String trimmedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String rawTrimmedEmail = request.getEmail() != null ? request.getEmail().trim() : "";

        if (userRepository.existsByEmail(trimmedEmail) || userRepository.existsByEmail(rawTrimmedEmail)) {
            throw new DataIntegrityViolationException("An account with this email (" + rawTrimmedEmail + ") already exists.");
        }

        Role role = request.getRole() != null ? request.getRole() : Role.FARMER;

        // Public self-registration may only create FARMER accounts.
        if (role == Role.CEO) {
            throw new AccessDeniedException("CEO accounts cannot be created via public registration.");
        }

        String cleanedName = request.getName() != null ? request.getName().trim() : "";
        String cleanedPhone = request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null;

        User user = User.builder()
                .name(cleanedName)
                .email(trimmedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .phone(cleanedPhone)
                .isActive(true)
                .build();

        userRepository.save(user);

        if (user.getRole() == Role.FARMER) {
            farmService.createDefaultFarmForNewFarmer(user);
        }

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtService.generateToken(principal);

        return ResponseEntity.status(HttpStatus.CREATED).body(buildAuthResponse(token, user));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        String trimmedEmail = request.getEmail() != null ? request.getEmail().trim() : "";
        String lowerEmail = trimmedEmail.toLowerCase();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(trimmedEmail, request.getPassword())
        );

        User user = userRepository.findByEmail(trimmedEmail)
                .or(() -> userRepository.findByEmail(lowerEmail))
                .or(() -> userRepository.findByEmail(request.getEmail()))
                .orElseThrow(() -> new IllegalStateException("User not found after authentication"));

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtService.generateToken(principal);

        return ResponseEntity.ok(buildAuthResponse(token, user));
    }

    private AuthResponse buildAuthResponse(String token, User user) {
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .build();
    }
}
