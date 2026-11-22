package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.AuthResponse;
import com.poultry.poultrymanagement.dto.BatchRequest;
import com.poultry.poultrymanagement.dto.BatchResponse;
import com.poultry.poultrymanagement.dto.RegisterRequest;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.UserRepository;
import com.poultry.poultrymanagement.service.BatchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class AuthRegistrationIntegrationTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private BatchService batchService;

    @Test
    @Transactional
    void farmerRegistrationCreatesFarmAndFarmerProfileInOneTransaction() {
        String email = "farmer-" + System.currentTimeMillis() + "@example.com";

        RegisterRequest request = new RegisterRequest();
        request.setName("Test Farmer");
        request.setEmail(email);
        request.setPassword("password123");
        request.setRole(Role.FARMER);
        request.setPhone("1234567890");

        ResponseEntity<AuthResponse> response = authController.register(request);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();

        Long userId = response.getBody().getUserId();
        assertThat(userRepository.findById(userId)).isPresent();
        assertThat(farmerRepository.findByUserId(userId)).isPresent();

        var farmer = farmerRepository.findByUserId(userId).orElseThrow();
        assertThat(farmer.getFarm()).isNotNull();
        assertThat(farmer.getFarm().getName()).contains("Test Farmer");
    }

    @Test
    @Transactional
    void farmerBatchStartsActiveImmediately() {
        String email = "batch-farmer-" + System.currentTimeMillis() + "@example.com";

        RegisterRequest request = new RegisterRequest();
        request.setName("Active Batch Farmer");
        request.setEmail(email);
        request.setPassword("password123");
        request.setRole(Role.FARMER);
        request.setPhone("5551234567");

        ResponseEntity<AuthResponse> response = authController.register(request);
        Long userId = response.getBody().getUserId();
        var farmer = farmerRepository.findByUserId(userId).orElseThrow();

        BatchRequest batchRequest = new BatchRequest();
        batchRequest.setFarmId(farmer.getFarm().getId());
        batchRequest.setInitialBirds(2500);

        BatchResponse created = batchService.createBatch(batchRequest, userId);

        assertThat(created.getStatus()).isEqualTo(BatchStatus.ACTIVE);
        assertThat(created.getStartDate()).isNotNull();
        assertThat(created.getFarmId()).isEqualTo(farmer.getFarm().getId());
    }

    @Test
    void ceoCanLoginSuccessfully() {
        var loginRequest = new com.poultry.poultrymanagement.dto.LoginRequest("ceo@poultry.local", "password123");
        var response = authController.login(loginRequest);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getRole()).isEqualTo(Role.CEO);
    }

    @Test
    void loginWithMixedCaseAndWhitespaceSucceeds() {
        var loginRequest = new com.poultry.poultrymanagement.dto.LoginRequest("  CEO@POULTRY.LOCAL  ", "password123");
        var response = authController.login(loginRequest);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEmail()).isEqualTo("ceo@poultry.local");
    }

    @Test
    @Transactional
    void registrationTrimsAndLowercasesEmailProperly() {
        String base = "SpacesFarmer" + System.currentTimeMillis();
        String rawEmail = "  " + base + "@EXAMPLE.COM  ";

        RegisterRequest request = RegisterRequest.builder()
                .name("  Untrimmed Name  ")
                .email(rawEmail)
                .password("password123")
                .role(Role.FARMER)
                .phone("  1234567890  ")
                .build();

        ResponseEntity<AuthResponse> response = authController.register(request);
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEmail()).isEqualTo(base.toLowerCase() + "@example.com");
        assertThat(response.getBody().getName()).isEqualTo("Untrimmed Name");

        // Login with uppercase/spaces for this new user must also succeed
        var loginReq = new com.poultry.poultrymanagement.dto.LoginRequest(" " + base.toUpperCase() + "@example.com ", "password123");
        var loginRes = authController.login(loginReq);
        assertThat(loginRes.getStatusCode().is2xxSuccessful()).isTrue();
    }
}
