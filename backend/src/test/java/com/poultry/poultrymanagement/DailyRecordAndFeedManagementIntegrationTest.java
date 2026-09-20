package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.exception.InsufficientFeedStockException;
import com.poultry.poultrymanagement.exception.InvalidMortalityException;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.service.BatchService;
import com.poultry.poultrymanagement.service.DailyRecordService;
import com.poultry.poultrymanagement.service.FeedLoadService;
import org.junit.jupiter.api.DisplayName;
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
class DailyRecordAndFeedManagementIntegrationTest {

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
    private com.poultry.poultrymanagement.repository.BatchRepository batchRepository;

    @Test
    @Transactional
    @DisplayName("Complete test for Feed Management & Daily Data Insertion improvements")
    void testFeedAndDailyRecordsComprehensive() {
        // 1. Create Farmer 1
        String email1 = "test-farmer1-" + System.currentTimeMillis() + "@poultry.com";
        RegisterRequest reg1 = RegisterRequest.builder()
                .name("John Farmer")
                .email(email1)
                .password("password123")
                .role(Role.FARMER)
                .phone("1234567890")
                .build();
        ResponseEntity<AuthResponse> res1 = authController.register(reg1);
        Long user1Id = res1.getBody().getUserId();
        var farmer1 = farmerRepository.findByUserId(user1Id).orElseThrow();

        // 2. Create Active Batch for Farmer 1 (5,000 birds)
        BatchRequest batchReq1 = BatchRequest.builder()
                .farmId(farmer1.getFarm().getId())
                .initialBirds(5000)
                .build();
        BatchResponse batch1 = batchService.createBatch(batchReq1, user1Id);
        Long batch1Id = batch1.getId();

        // Set batch start date 5 days in the past to allow records from past days
        var batchEntity = batchRepository.findById(batch1Id).orElseThrow();
        batchEntity.setStartDate(LocalDate.now().minusDays(5));
        batchRepository.save(batchEntity);

        // Check initial stock is 0
        FeedStockResponse initialStock = feedLoadService.getFeedStock(batch1Id, user1Id, Role.FARMER);
        assertThat(initialStock.getCurrentStockKg()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(initialStock.getCurrentBags()).isEqualByComparingTo(BigDecimal.ZERO);

        // 3. ZERO STOCK PROTECTION: Try adding daily record consuming 2 bags of Starter 50kg when stock is 0 -> MUST FAIL (409)
        DailyRecordRequest zeroStockRecord = DailyRecordRequest.builder()
                .mortality(2)
                .feedBagsConsumed(BigDecimal.valueOf(2))
                .bagCapacityKg(BigDecimal.valueOf(50))
                .feedType("Starter")
                .build();
        assertThatThrownBy(() -> dailyRecordService.addDailyRecord(batch1Id, zeroStockRecord, user1Id))
                .isInstanceOf(InsufficientFeedStockException.class)
                .hasMessage("Insufficient Starter 50 kg feed bags. Available: 0 bags.");

        // 4. FEED LOADING: Load 10 bags of 50kg Starter feed (+500 kg)
        FeedLoadRequest load50kg = FeedLoadRequest.builder()
                .bags(BigDecimal.valueOf(10))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .feedType("Starter")
                .build();
        FeedLoadResponse loadRes1 = feedLoadService.addFeedLoad(batch1Id, load50kg, user1Id);
        assertThat(loadRes1.getLoadDate()).isEqualTo(LocalDate.now()); // Auto date
        assertThat(loadRes1.getTotalWeightKg()).isEqualByComparingTo(BigDecimal.valueOf(500));
        assertThat(loadRes1.getFeedType()).isEqualTo("Starter");

        // Verify stock is now 500 kg
        FeedStockResponse stockAfterLoad1 = feedLoadService.getFeedStock(batch1Id, user1Id, Role.FARMER);
        assertThat(stockAfterLoad1.getCurrentStockKg()).isEqualByComparingTo(BigDecimal.valueOf(500));
        assertThat(stockAfterLoad1.getTotalLoadedKg()).isEqualByComparingTo(BigDecimal.valueOf(500));
        assertThat(stockAfterLoad1.getStarterLoadedKg()).isEqualByComparingTo(BigDecimal.valueOf(500));
        assertThat(stockAfterLoad1.getCurrentBags()).isEqualByComparingTo(BigDecimal.valueOf(10));

        // 5. CRITICAL CAPACITY-AWARE VALIDATION TEST:
        // We have 10 x 50kg Starter bags (500 kg). We have ZERO 70kg Starter bags.
        // Attempting to consume 2 x 70kg Starter bags MUST FAIL with 409 Conflict.
        DailyRecordRequest consume70kgFail = DailyRecordRequest.builder()
                .mortality(1)
                .feedBagsConsumed(BigDecimal.valueOf(2))
                .bagCapacityKg(BigDecimal.valueOf(70))
                .feedType("Starter")
                .build();
        assertThatThrownBy(() -> dailyRecordService.addDailyRecord(batch1Id, consume70kgFail, user1Id))
                .isInstanceOf(InsufficientFeedStockException.class)
                .hasMessage("Insufficient Starter 70 kg feed bags. Available: 0 bags.");

        // 6. VALID CONSUMPTION: Consume 2 x 50kg Starter bags -> SUCCEEDS (Leaves 8 bags x 50kg = 400kg)
        DailyRecordRequest valid50kgRecord = DailyRecordRequest.builder()
                .recordDate(LocalDate.now().minusDays(1))
                .mortality(3)
                .feedBagsConsumed(BigDecimal.valueOf(2))
                .bagCapacityKg(BigDecimal.valueOf(50))
                .feedType("Starter")
                .avgWeightG(BigDecimal.valueOf(800))
                .notes("Day 1 feed consumption")
                .build();
        DailyRecordResponse saved50kg = dailyRecordService.addDailyRecord(batch1Id, valid50kgRecord, user1Id);
        assertThat(saved50kg.getFeedConsumedKg()).isEqualByComparingTo(BigDecimal.valueOf(100));

        FeedStockResponse stockAfter50kgConsumed = feedLoadService.getFeedStock(batch1Id, user1Id, Role.FARMER);
        assertThat(stockAfter50kgConsumed.getCurrentStockKg()).isEqualByComparingTo(BigDecimal.valueOf(400));
        assertThat(stockAfter50kgConsumed.getCurrentBags()).isEqualByComparingTo(BigDecimal.valueOf(8));

        // 7. FEED LOADING (70kg bag): Load 5 bags of 70kg Starter feed (+350 kg)
        FeedLoadRequest load70kg = FeedLoadRequest.builder()
                .bags(BigDecimal.valueOf(5))
                .weightPerBagKg(BigDecimal.valueOf(70))
                .feedType("Starter")
                .build();
        FeedLoadResponse loadRes2 = feedLoadService.addFeedLoad(batch1Id, load70kg, user1Id);
        assertThat(loadRes2.getTotalWeightKg()).isEqualByComparingTo(BigDecimal.valueOf(350));

        // Stock now: 8 x 50kg (400kg) + 5 x 70kg (350kg) = 750kg (13 total bags)
        FeedStockResponse stockAfterLoad2 = feedLoadService.getFeedStock(batch1Id, user1Id, Role.FARMER);
        assertThat(stockAfterLoad2.getCurrentStockKg()).isEqualByComparingTo(BigDecimal.valueOf(750));
        assertThat(stockAfterLoad2.getCurrentBags()).isEqualByComparingTo(BigDecimal.valueOf(13));

        // 8. VALID CONSUMPTION OF 70KG: Consume 2 x 70kg Starter -> SUCCEEDS (Leaves 3 bags x 70kg = 210kg)
        DailyRecordRequest valid70kgRecord = DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(2)
                .feedBagsConsumed(BigDecimal.valueOf(2))
                .bagCapacityKg(BigDecimal.valueOf(70))
                .feedType("Starter")
                .avgWeightG(BigDecimal.valueOf(1200))
                .notes("Day 2 feed consumption with 70kg bag")
                .build();
        DailyRecordResponse saved70kg = dailyRecordService.addDailyRecord(batch1Id, valid70kgRecord, user1Id);
        assertThat(saved70kg.getFeedConsumedKg()).isEqualByComparingTo(BigDecimal.valueOf(140));

        // Stock now: 8 x 50kg (400kg) + 3 x 70kg (210kg) = 610kg (11 total bags)
        FeedStockResponse stockAfter70kgConsumed = feedLoadService.getFeedStock(batch1Id, user1Id, Role.FARMER);
        assertThat(stockAfter70kgConsumed.getCurrentStockKg()).isEqualByComparingTo(BigDecimal.valueOf(610));
        assertThat(stockAfter70kgConsumed.getCurrentBags()).isEqualByComparingTo(BigDecimal.valueOf(11));

        // 9. ATTEMPT EXCESS CONSUMPTION OF 70KG: Available is 3 bags, attempt to consume 4 bags -> MUST FAIL with 409
        // (Note: To test validation failure on a new date or update, we verify 409 exception)
        DailyRecordRequest excess70kg = DailyRecordRequest.builder()
                .mortality(1)
                .feedBagsConsumed(BigDecimal.valueOf(4))
                .bagCapacityKg(BigDecimal.valueOf(70))
                .feedType("Starter")
                .build();
        assertThatThrownBy(() -> dailyRecordService.validateFeedCapacityStock(batch1Id, null, "STARTER", "Starter", BigDecimal.valueOf(70), BigDecimal.valueOf(4)))
                .isInstanceOf(InsufficientFeedStockException.class)
                .hasMessage("Insufficient Starter 70 kg feed bags. Available: 3 bags.");

        // 10. MORTALITY EXCEEDED PROTECTION: Initial birds is 5,000, try entering mortality of 6,000 -> MUST FAIL
        DailyRecordRequest excessMortalityRecord = DailyRecordRequest.builder()
                .recordDate(LocalDate.now().minusDays(2))
                .mortality(6000)
                .feedBagsConsumed(BigDecimal.valueOf(1))
                .bagCapacityKg(BigDecimal.valueOf(50))
                .feedType("Starter")
                .build();
        assertThatThrownBy(() -> dailyRecordService.addDailyRecord(batch1Id, excessMortalityRecord, user1Id))
                .isInstanceOf(InvalidMortalityException.class)
                .hasMessageContaining("cannot exceed current live bird count");

        // 11. BATCH ISOLATION & SECURITY:
        // Register Farmer 2 and create Batch 2
        String email2 = "test-farmer2-" + System.currentTimeMillis() + "@poultry.com";
        RegisterRequest reg2 = RegisterRequest.builder()
                .name("Mary Farmer")
                .email(email2)
                .password("password123")
                .role(Role.FARMER)
                .phone("9876543210")
                .build();
        ResponseEntity<AuthResponse> res2 = authController.register(reg2);
        Long user2Id = res2.getBody().getUserId();
        var farmer2 = farmerRepository.findByUserId(user2Id).orElseThrow();

        BatchRequest batchReq2 = BatchRequest.builder()
                .farmId(farmer2.getFarm().getId())
                .initialBirds(3000)
                .build();
        BatchResponse batch2 = batchService.createBatch(batchReq2, user2Id);
        Long batch2Id = batch2.getId();

        // Load 300kg feed for Batch 2 (6 x 50kg Finisher)
        feedLoadService.addFeedLoad(batch2Id, FeedLoadRequest.builder()
                .bags(BigDecimal.valueOf(6))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .feedType("Finisher")
                .build(), user2Id);

        FeedStockResponse stockBatch2 = feedLoadService.getFeedStock(batch2Id, user2Id, Role.FARMER);
        assertThat(stockBatch2.getCurrentStockKg()).isEqualByComparingTo(BigDecimal.valueOf(300));
        assertThat(stockBatch2.getCurrentBags()).isEqualByComparingTo(BigDecimal.valueOf(6));

        // Batch 1 stock must remain untouched (610 kg, 11 bags)
        FeedStockResponse stockBatch1Check = feedLoadService.getFeedStock(batch1Id, user1Id, Role.FARMER);
        assertThat(stockBatch1Check.getCurrentStockKg()).isEqualByComparingTo(BigDecimal.valueOf(610));
        assertThat(stockBatch1Check.getCurrentBags()).isEqualByComparingTo(BigDecimal.valueOf(11));

        // Farmer 2 CANNOT access or load feed or add records to Batch 1
        assertThatThrownBy(() -> feedLoadService.addFeedLoad(batch1Id, load50kg, user2Id))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> dailyRecordService.addDailyRecord(batch1Id, valid50kgRecord, user2Id))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> feedLoadService.getFeedStock(batch1Id, user2Id, Role.FARMER))
                .isInstanceOf(AccessDeniedException.class);

        // 12. Verify history list returns records properly
        List<FeedLoadResponse> batch1Loads = feedLoadService.getFeedLoads(batch1Id, user1Id, Role.FARMER);
        assertThat(batch1Loads).hasSize(2);

        List<DailyRecordResponse> batch1Records = dailyRecordService.getDailyRecords(batch1Id, user1Id, Role.FARMER);
        assertThat(batch1Records).hasSize(2);

        // Verify inventory list contains items with stock status
        assertThat(stockBatch1Check.getInventory()).isNotEmpty();
        var starter50 = stockBatch1Check.getInventory().stream()
                .filter(i -> "STARTER".equals(i.getFeedType()) && i.getBagCapacityKg().compareTo(BigDecimal.valueOf(50)) == 0)
                .findFirst().orElseThrow();
        assertThat(starter50.getAvailableBags()).isEqualByComparingTo(BigDecimal.valueOf(8));
        assertThat(starter50.getAvailableKg()).isEqualByComparingTo(BigDecimal.valueOf(400));
        assertThat(starter50.getStockStatus()).isEqualTo("NORMAL");

        var starter70 = stockBatch1Check.getInventory().stream()
                .filter(i -> "STARTER".equals(i.getFeedType()) && i.getBagCapacityKg().compareTo(BigDecimal.valueOf(70)) == 0)
                .findFirst().orElseThrow();
        assertThat(starter70.getAvailableBags()).isEqualByComparingTo(BigDecimal.valueOf(3));
        assertThat(starter70.getAvailableKg()).isEqualByComparingTo(BigDecimal.valueOf(210));
        assertThat(starter70.getStockStatus()).isEqualTo("NORMAL");
    }
}
