package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.service.AiAssistantService;
import com.poultry.poultrymanagement.service.BatchService;
import com.poultry.poultrymanagement.service.DailyRecordService;
import com.poultry.poultrymanagement.service.FeedLoadService;
import com.poultry.poultrymanagement.service.SaleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class PoultryWorkflowAndSecurityIntegrationTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private BatchService batchService;

    @Autowired
    private FeedLoadService feedLoadService;

    @Autowired
    private DailyRecordService dailyRecordService;

    @Autowired
    private SaleService saleService;

    @Autowired
    private AiAssistantService aiAssistantService;

    @Test
    @Transactional
    void completeFarmerWorkflowAndSecurityCheck() {
        // 1. Register Farmer A
        String emailA = "farmer-a-" + System.currentTimeMillis() + "@test.com";
        RegisterRequest regA = RegisterRequest.builder()
                .name("Farmer Alice")
                .email(emailA)
                .password("password123")
                .role(Role.FARMER)
                .phone("1112223333")
                .build();
        ResponseEntity<AuthResponse> resA = authController.register(regA);
        Long userAId = resA.getBody().getUserId();
        var farmerA = farmerRepository.findByUserId(userAId).orElseThrow();

        // 2. Start Active Batch for Farmer A
        BatchRequest batchReq = BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(3000)
                .build();
        BatchResponse activeBatch = batchService.createBatch(batchReq, userAId);
        assertThat(activeBatch.getStatus()).isEqualTo(BatchStatus.ACTIVE);
        assertThat(activeBatch.getStartDate()).isEqualTo(LocalDate.now());

        // 2b. Load Feed for Farmer A (10 bags x 50kg = 500kg Starter)
        FeedLoadRequest feedReq = FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(10))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build();
        FeedLoadResponse feedRes = feedLoadService.addFeedLoad(activeBatch.getId(), feedReq, userAId);
        assertThat(feedRes.getTotalWeightKg()).isEqualByComparingTo(BigDecimal.valueOf(500));

        // 3. Insert Daily Record for Farmer A
        DailyRecordRequest recordReq = DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .morningMortality(2)
                .mortality(5)
                .minFeedIntakeG(BigDecimal.valueOf(110))
                .feedConsumedKg(BigDecimal.valueOf(330))
                .minBodyWeightG(BigDecimal.valueOf(1600))
                .avgWeightG(BigDecimal.valueOf(1650))
                .standardFcr(BigDecimal.valueOf(1.55))
                .feedBagsConsumed(BigDecimal.valueOf(6.6))
                .feedBagsTotal(BigDecimal.valueOf(50))
                .feedBagsClosingStock(BigDecimal.valueOf(43.4))
                .signature("Alice F.")
                .notes("Flock feeding actively with good appetite.")
                .build();
        DailyRecordResponse recordRes = dailyRecordService.addDailyRecord(activeBatch.getId(), recordReq, userAId);
        assertThat(recordRes.getMortality()).isEqualTo(5);
        assertThat(recordRes.getRemainingBirds()).isEqualTo(2995);
        assertThat(recordRes.getFcr()).isNotNull();

        // 4. Add Sale for Farmer A
        SaleRequest saleReq = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Green Valley Traders")
                .birdsSold(500)
                .totalWeightKg(BigDecimal.valueOf(1000))
                .ratePerKg(BigDecimal.valueOf(2.50))
                .liftingSignature("Trader Bob")
                .build();
        SaleResponse saleRes = saleService.addSale(activeBatch.getId(), saleReq, userAId);
        assertThat(saleRes.getTraderName()).isEqualTo("Green Valley Traders");
        assertThat(saleRes.getBirdsSold()).isEqualTo(500);
        assertThat(saleRes.getRevenue()).isEqualByComparingTo(BigDecimal.valueOf(2500.00));

        // 5. Test AI Assistant Query for Farmer A
        AiQueryResponse aiRes = aiAssistantService.processQuery("What was my mortality in the previous batch?", userAId);
        assertThat(aiRes.getAnswer()).isNotEmpty();

        AiQueryResponse aiSalesRes = aiAssistantService.processQuery("How many birds were sold?", userAId);
        assertThat(aiSalesRes.getAnswer()).contains("500");

        // 6. Register Farmer B
        String emailB = "farmer-b-" + System.currentTimeMillis() + "@test.com";
        RegisterRequest regB = RegisterRequest.builder()
                .name("Farmer Bob")
                .email(emailB)
                .password("password123")
                .role(Role.FARMER)
                .phone("4445556666")
                .build();
        ResponseEntity<AuthResponse> resB = authController.register(regB);
        Long userBId = resB.getBody().getUserId();

        // 7. Security IDOR Check: Farmer B must NOT be able to access or modify Farmer A's batch
        assertThatThrownBy(() -> batchService.getBatchById(activeBatch.getId(), userBId, Role.FARMER))
                .isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() -> dailyRecordService.addDailyRecord(activeBatch.getId(), recordReq, userBId))
                .isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() -> saleService.addSale(activeBatch.getId(), saleReq, userBId))
                .isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() -> batchService.endBatch(activeBatch.getId(), userBId))
                .isInstanceOf(AccessDeniedException.class);

        // 8. End Batch by Owner (Farmer A) - Sell remaining 2495 birds first
        saleService.addSale(activeBatch.getId(), SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Green Valley Traders - Final")
                .birdsSold(2495)
                .totalWeightKg(BigDecimal.valueOf(4990))
                .ratePerKg(BigDecimal.valueOf(2.50))
                .liftingSignature("Trader Bob")
                .build(), userAId);

        BatchResponse endedBatch = batchService.endBatch(activeBatch.getId(), userAId);
        assertThat(endedBatch.getStatus()).isEqualTo(BatchStatus.COMPLETED);
        assertThat(endedBatch.getEndDate()).isEqualTo(LocalDate.now());

        // 9. Completed Batch must reject new daily entries
        DailyRecordRequest postEndRecord = DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(1)
                .feedConsumedKg(BigDecimal.valueOf(50))
                .build();
        assertThatThrownBy(() -> dailyRecordService.addDailyRecord(activeBatch.getId(), postEndRecord, userAId))
                .isInstanceOf(com.poultry.poultrymanagement.exception.BatchCompletedException.class);
    }
}
