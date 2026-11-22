package com.poultry.poultrymanagement.security;

import com.poultry.poultrymanagement.entity.User;
import com.poultry.poultrymanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (email == null || email.trim().isEmpty()) {
            throw new UsernameNotFoundException("Email cannot be empty");
        }
        String trimmed = email.trim();
        String lower = trimmed.toLowerCase();

        User user = userRepository.findByEmail(trimmed)
                .or(() -> userRepository.findByEmail(lower))
                .or(() -> userRepository.findByEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("No user found with email: " + email));

        return new UserPrincipal(user);
    }
}
