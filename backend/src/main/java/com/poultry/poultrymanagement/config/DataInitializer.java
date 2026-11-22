package com.poultry.poultrymanagement.config;

import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.User;
import com.poultry.poultrymanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        ensureCeoUser("ceo@poultry.local", "Poultry CEO");
        ensureFarmerPassword("rajan@poultry.local");
        ensureFarmerPassword("priya@poultry.local");
    }

    private void ensureFarmerPassword(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setPasswordHash(passwordEncoder.encode("farmer123"));
            userRepository.save(user);
            log.info("Reset password for farmer: {}", email);
        });
    }

    private void ensureCeoUser(String email, String name) {
        userRepository.findByEmail(email).ifPresentOrElse(
                user -> {
                    user.setPasswordHash(passwordEncoder.encode("password123"));
                    user.setRole(Role.CEO);
                    user.setIsActive(true);
                    userRepository.save(user);
                    log.info("Updated CEO account: {}", email);
                },
                () -> {
                    User ceo = User.builder()
                            .name(name)
                            .email(email)
                            .passwordHash(passwordEncoder.encode("password123"))
                            .role(Role.CEO)
                            .phone("9998887777")
                            .isActive(true)
                            .build();
                    userRepository.save(ceo);
                    log.info("Created default CEO account: {}", email);
                }
        );
    }
}
