package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.*;
import com.poultry.poultrymanagement.repository.*;
import com.poultry.poultrymanagement.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class AiAssistantComprehensiveIntegrationTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private BatchService batchService;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private FeedLoadService feedLoadService;

    @Autowired
    private DailyRecordService dailyRecordService;

    @Autowired
    private RemarkService remarkService;

    @Autowired
    private SaleService saleService;

    @Autowired
    private AiAssistantService aiAssistantService;

    private Long userAId;
    private Long userBId;
    private Farmer farmerA;
    private Farmer farmerB;

    @BeforeEach
    void setUp() {
        // Register Farmer A
        String emailA = "ai-test-farmer-a-" + System.currentTimeMillis() + "@poultry.com";
        ResponseEntity<AuthResponse> resA = authController.register(RegisterRequest.builder()
                .name("Farmer Arthur")
                .email(emailA)
                .password("password123")
                .role(Role.FARMER)
                .phone("9988776655")
                .build());
        userAId = resA.getBody().getUserId();
        farmerA = farmerRepository.findByUserId(userAId).orElseThrow();

        // Register Farmer B (for data isolation testing)
        String emailB = "ai-test-farmer-b-" + System.currentTimeMillis() + "@poultry.com";
        ResponseEntity<AuthResponse> resB = authController.register(RegisterRequest.builder()
                .name("Farmer Beatrice")
                .email(emailB)
                .password("password123")
                .role(Role.FARMER)
                .phone("9988776644")
                .build());
        userBId = resB.getBody().getUserId();
        farmerB = farmerRepository.findByUserId(userBId).orElseThrow();
    }

    @Test
    @Transactional
    @DisplayName("1. Current Batch Analysis with Live Database Values")
    void testCurrentBatchAnalysis() {
        // Create batch for Farmer A
        BatchResponse batch = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(2000)
                .build(), userAId);

        // Load Feed: 20 bags x 50kg = 1000kg Starter
        feedLoadService.addFeedLoad(batch.getId(), FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(20))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userAId);

        // Insert Daily Record: 10 mortality, 200kg feed, 1200g weight
        dailyRecordService.addDailyRecord(batch.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .morningMortality(4)
                .mortality(10)
                .feedConsumedKg(BigDecimal.valueOf(200))
                .avgWeightG(BigDecimal.valueOf(1200))
                .standardFcr(BigDecimal.valueOf(1.50))
                .feedBagsConsumed(BigDecimal.valueOf(4))
                .feedBagsTotal(BigDecimal.valueOf(20))
                .feedBagsClosingStock(BigDecimal.valueOf(16))
                .notes("Chicks are active and drinking well.")
                .build(), userAId);

        AiQueryResponse response = aiAssistantService.processQuery("Analyze my current batch", userAId);

        assertThat(response.getAnswer()).isNotEmpty();
        assertThat(response.getAnswer()).contains("2,000"); // Initial birds
        assertThat(response.getAnswer()).contains("1,990"); // Remaining live birds
        assertThat(response.getAnswer()).contains("10");    // Recorded mortality
        assertThat(response.getCategory()).isEqualTo("Current Batch Analysis");
        assertThat(response.getKeyInsights()).isNotEmpty();
    }

    @Test
    @Transactional
    @DisplayName("2. Health Screening & Warning Signs Analysis")
    void testHealthAndWarningSigns() {
        BatchResponse batch = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(1000)
                .build(), userAId);

        // Load feed first
        feedLoadService.addFeedLoad(batch.getId(), FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(10))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userAId);

        // Log a respiratory remark
        remarkService.addRemark(batch.getId(), RemarkRequest.builder()
                .remarkDate(LocalDate.now())
                .note("Observed mild coughing and sneezing near drinker lines.")
                .build(), userAId);

        // Add daily record with high mortality
        dailyRecordService.addDailyRecord(batch.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(15)
                .feedConsumedKg(BigDecimal.valueOf(100))
                .avgWeightG(BigDecimal.valueOf(800))
                .build(), userAId);

        AiQueryResponse response = aiAssistantService.processQuery("Are there any warning signs in my batch?", userAId);

        assertThat(response.getAnswer()).contains("coughing");
        assertThat(response.getCategory()).isEqualTo("Health & Warning Signs");
        assertThat(response.getAnswer()).contains("RECORDED FLOCK STATUS");
        assertThat(response.getAnswer()).contains("POSSIBLE CAUSES");
    }

    @Test
    @Transactional
    @DisplayName("3. Historical Batch Comparison & Lowest Mortality")
    void testHistoricalBatchComparison() {
        // Batch 1 (Completed): 1000 birds, 20 mortality
        BatchResponse b1 = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(1000)
                .build(), userAId);
        feedLoadService.addFeedLoad(b1.getId(), FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(40))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userAId);
        dailyRecordService.addDailyRecord(b1.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(20)
                .feedConsumedKg(BigDecimal.valueOf(1500))
                .avgWeightG(BigDecimal.valueOf(2000))
                .build(), userAId);
        saleService.addSale(b1.getId(), SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Batch1 Trader")
                .birdsSold(980)
                .totalWeightKg(BigDecimal.valueOf(1960))
                .ratePerKg(BigDecimal.valueOf(120))
                .build(), userAId);
        batchService.endBatch(b1.getId(), userAId);

        // Batch 2 (Active): 1500 birds, 10 mortality
        BatchResponse b2 = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(1500)
                .build(), userAId);
        feedLoadService.addFeedLoad(b2.getId(), FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(30))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userAId);
        dailyRecordService.addDailyRecord(b2.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(10)
                .feedConsumedKg(BigDecimal.valueOf(800))
                .avgWeightG(BigDecimal.valueOf(1100))
                .build(), userAId);

        // Test Compare query
        AiQueryResponse compareRes = aiAssistantService.processQuery("Compare current batch with previous batch", userAId);
        assertThat(compareRes.getAnswer()).contains("Comparative Performance");
        assertThat(compareRes.getAnswer()).contains("1,000");

        // Test Lowest mortality query
        AiQueryResponse lowestRes = aiAssistantService.processQuery("Which batch had the lowest mortality?", userAId);
        assertThat(lowestRes.getAnswer()).isNotEmpty();
        assertThat(lowestRes.getCategory()).isEqualTo("Mortality Analysis");
    }

    @Test
    @Transactional
    @DisplayName("4. Strict Medicine Safety Guard - Zero Invention Rule")
    void testMedicineSafetyGuard() {
        BatchResponse batch = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(1000)
                .build(), userAId);

        // Test with age-specific drug query
        AiQueryResponse response = aiAssistantService.processQuery("How much Tornic should I use for 19-day-old chicks?", userAId);

        assertThat(response.getCategory()).isEqualTo("Medication Safety");
        assertThat(response.getAnswer()).contains("strictly does NOT calculate, prescribe, or invent drug dosages");
        assertThat(response.getAnswer()).contains("Consult a Veterinarian");
        assertThat(response.getAnswer()).contains("Inspect Product Packaging");
    }

    @Test
    @Transactional
    @DisplayName("5. Heat Stress Evaluation")
    void testHeatStressAssistance() {
        BatchResponse batch = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(1000)
                .build(), userAId);

        AiQueryResponse response = aiAssistantService.processQuery("How to handle heat stress in my shed?", userAId);

        assertThat(response.getCategory()).isEqualTo("Heat Stress Management");
        assertThat(response.getAnswer()).contains("Airflow Velocity");
        assertThat(response.getAnswer()).contains("Water Line Flushing");
        assertThat(response.getAnswer()).contains("Feeding Schedule");
    }

    @Test
    @Transactional
    @DisplayName("6. Bird Weight Analysis")
    void testWeightAnalysis() {
        BatchResponse batch = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(1000)
                .build(), userAId);

        Batch batchEntity = batchRepository.findById(batch.getId()).orElseThrow();
        batchEntity.setStartDate(LocalDate.now().minusDays(5));
        batchRepository.save(batchEntity);

        dailyRecordService.addDailyRecord(batch.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now().minusDays(3))
                .mortality(2)
                .avgWeightG(BigDecimal.valueOf(1200))
                .build(), userAId);

        dailyRecordService.addDailyRecord(batch.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(1)
                .avgWeightG(BigDecimal.valueOf(1380))
                .build(), userAId);

        AiQueryResponse response = aiAssistantService.processQuery("Analyze my bird weight", userAId);

        assertThat(response.getCategory()).isEqualTo("Weight & Growth");
        assertThat(response.getAnswer()).contains("1380");
        assertThat(response.getAnswer()).contains("+180");
    }

    @Test
    @Transactional
    @DisplayName("7. Feed Stock & Consumption Analysis")
    void testFeedStockAnalysis() {
        BatchResponse batch = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(1000)
                .build(), userAId);

        feedLoadService.addFeedLoad(batch.getId(), FeedLoadRequest.builder()
                .feedType("Finisher")
                .bags(BigDecimal.valueOf(10))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userAId);

        dailyRecordService.addDailyRecord(batch.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .feedConsumedKg(BigDecimal.valueOf(150))
                .build(), userAId);

        AiQueryResponse response = aiAssistantService.processQuery("Check my feed stock", userAId);

        assertThat(response.getCategory()).isEqualTo("Feed & Inventory");
        assertThat(response.getAnswer()).contains("350 kg"); // 500 loaded - 150 consumed = 350
        assertThat(response.getAnswer()).contains("500 kg");
    }

    @Test
    @Transactional
    @DisplayName("8. Data Isolation Security - Farmer A cannot access Farmer B's records")
    void testDataIsolationSecurity() {
        // Farmer B has a batch with 5000 birds
        BatchResponse batchB = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerB.getFarm().getId())
                .initialBirds(5000)
                .build(), userBId);

        // Farmer A queries the AI assistant - must only see Farmer A's data (no batches or 0 birds)
        AiQueryResponse responseA = aiAssistantService.processQuery("Analyze my current batch", userAId);
        assertThat(responseA.getAnswer()).doesNotContain("5,000");

        // Farmer B queries the AI assistant - sees 5000 birds
        AiQueryResponse responseB = aiAssistantService.processQuery("Analyze my current batch", userBId);
        assertThat(responseB.getAnswer()).contains("5,000");
    }
}
