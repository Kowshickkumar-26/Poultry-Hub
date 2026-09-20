package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class FarmerProfileAndCeoVisibilityIntegrationTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private FarmerService farmerService;

    @Autowired
    private FarmService farmService;

    @Autowired
    private BatchService batchService;

    @Autowired
    private DailyRecordService dailyRecordService;

    @Autowired
    private FeedLoadService feedLoadService;

    @Test
    @Transactional
    void testFarmerProfileUpdateAndCeoVisibility() {
        // 1. Register Farmer A
        String emailA = "alice-profile-" + System.currentTimeMillis() + "@poultry.com";
        RegisterRequest regA = RegisterRequest.builder()
                .name("Alice Original")
                .email(emailA)
                .password("securePassword123")
                .role(Role.FARMER)
                .phone("1234567890")
                .build();
        ResponseEntity<AuthResponse> resA = authController.register(regA);
        Long userAId = resA.getBody().getUserId();

        // 2. Query Farmer Profile (GET /api/farmers/me)
        FarmerResponse profileBefore = farmerService.getFarmerByUserId(userAId);
        assertThat(profileBefore.getUserName()).isEqualTo("Alice Original");
        assertThat(profileBefore.getUserEmail()).isEqualTo(emailA);
        assertThat(profileBefore.getUserPhone()).isEqualTo("1234567890");
        assertThat(profileBefore.getFarmId()).isNotNull();

        // 3. Update Farmer Profile (PUT /api/farmers/me)
        FarmerProfileUpdateRequest updateReq = FarmerProfileUpdateRequest.builder()
                .name("Alice Updated")
                .phone("+1 555-987-6543")
                .farmName("Alice Sunnyside Poultry")
                .farmLocation("North Valley District")
                .farmDescription("Modern automated poultry house with climate control and 10k capacity.")
                .build();
        FarmerResponse profileAfter = farmerService.updateFarmerProfile(userAId, updateReq);

        assertThat(profileAfter.getUserName()).isEqualTo("Alice Updated");
        assertThat(profileAfter.getUserPhone()).isEqualTo("+1 555-987-6543");
        assertThat(profileAfter.getFarmName()).isEqualTo("Alice Sunnyside Poultry");
        assertThat(profileAfter.getFarmLocation()).isEqualTo("North Valley District");
        assertThat(profileAfter.getFarmDescription()).isEqualTo("Modern automated poultry house with climate control and 10k capacity.");
        // Email must remain unchanged
        assertThat(profileAfter.getUserEmail()).isEqualTo(emailA);

        // 4. Verify Farm Details (GET /api/farms/me)
        FarmResponse farmRes = farmService.getMyFarm(userAId);
        assertThat(farmRes.getName()).isEqualTo("Alice Sunnyside Poultry");
        assertThat(farmRes.getLocation()).isEqualTo("North Valley District");
        assertThat(farmRes.getDescription()).isEqualTo("Modern automated poultry house with climate control and 10k capacity.");
        assertThat(farmRes.getOwnerName()).isEqualTo("Alice Updated");

        // 5. Start Batch for Farmer A & Load Feed & Record Data
        BatchRequest batchReq = BatchRequest.builder()
                .farmId(profileAfter.getFarmId())
                .initialBirds(5000)
                .build();
        BatchResponse batchRes = batchService.createBatch(batchReq, userAId);
        assertThat(batchRes.getStatus()).isEqualTo(BatchStatus.ACTIVE);

        // Feed load: 20 bags x 50kg = 1000kg
        feedLoadService.addFeedLoad(batchRes.getId(), FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(20))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userAId);

        // Daily Record: 10 dead, remaining 4990
        dailyRecordService.addDailyRecord(batchRes.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .morningMortality(3)
                .mortality(10)
                .feedConsumedKg(BigDecimal.valueOf(100))
                .build(), userAId);

        // 6. Check Farmer Profile live batch stats
        FarmerResponse profileWithBatch = farmerService.getFarmerByUserId(userAId);
        assertThat(profileWithBatch.getActiveBatchId()).isEqualTo(batchRes.getId());
        assertThat(profileWithBatch.getActiveBatchCode()).isEqualTo(batchRes.getBatchCode());
        assertThat(profileWithBatch.getActiveBatchStatus()).isEqualTo(BatchStatus.ACTIVE);
        assertThat(profileWithBatch.getInitialBirds()).isEqualTo(5000);
        assertThat(profileWithBatch.getRemainingBirds()).isEqualTo(4990);
        assertThat(profileWithBatch.getTotalMortality()).isEqualTo(10);
        assertThat(profileWithBatch.getFeedStockKg()).isEqualByComparingTo(BigDecimal.valueOf(900));

        // 7. Register Farmer B to test security boundaries
        String emailB = "bob-profile-" + System.currentTimeMillis() + "@poultry.com";
        RegisterRequest regB = RegisterRequest.builder()
                .name("Bob Farmer")
                .email(emailB)
                .password("securePassword123")
                .role(Role.FARMER)
                .phone("9998887777")
                .build();
        ResponseEntity<AuthResponse> resB = authController.register(regB);
        Long userBId = resB.getBody().getUserId();

        // Farmer B cannot access Farmer A's farm
        assertThatThrownBy(() -> farmService.getFarmById(profileAfter.getFarmId(), userBId, Role.FARMER))
                .isInstanceOf(AccessDeniedException.class);

        // 8. CEO Visibility: CEO lists all farmers
        List<FarmerResponse> ceoFarmerList = farmerService.getAllFarmers();
        assertThat(ceoFarmerList).isNotEmpty();

        FarmerResponse ceoViewAlice = ceoFarmerList.stream()
                .filter(f -> f.getUserId().equals(userAId))
                .findFirst()
                .orElseThrow();
        assertThat(ceoViewAlice.getUserName()).isEqualTo("Alice Updated");
        assertThat(ceoViewAlice.getActiveBatchCode()).isEqualTo(batchRes.getBatchCode());
        assertThat(ceoViewAlice.getRemainingBirds()).isEqualTo(4990);

        // 9. CEO Details View: CEO retrieves complete profile and history
        FarmerResponse ceoFullDetails = farmerService.getFarmerDetailsById(profileAfter.getId());
        assertThat(ceoFullDetails.getUserName()).isEqualTo("Alice Updated");
        assertThat(ceoFullDetails.getFarmDescription()).contains("Modern automated poultry house");
        assertThat(ceoFullDetails.getBatchHistory()).isNotEmpty();
        assertThat(ceoFullDetails.getBatchHistory().get(0).getBatchCode()).isEqualTo(batchRes.getBatchCode());
    }
}
