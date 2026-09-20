package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.ExpenseCategory;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.exception.BatchCompletedException;
import com.poultry.poultrymanagement.exception.InvalidSaleException;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class DomainValidationAndCompletedBatchTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private BatchService batchService;

    @Autowired
    private DailyRecordService dailyRecordService;

    @Autowired
    private SaleService saleService;

    @Autowired
    private FeedLoadService feedLoadService;

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private VaccineService vaccineService;

    @Autowired
    private RemarkService remarkService;

    private Long createFarmer(String namePrefix) {
        String email = namePrefix.toLowerCase() + "-" + System.nanoTime() + "@test.com";
        RegisterRequest req = RegisterRequest.builder()
                .name(namePrefix)
                .email(email)
                .password("password123")
                .role(Role.FARMER)
                .phone("9998887777")
                .build();
        ResponseEntity<AuthResponse> res = authController.register(req);
        return res.getBody().getUserId();
    }

    @Test
    @Transactional
    @DisplayName("Test 1 & 2: Sales validation - Initial 5000, Mortality 100, Previous Sales 200 -> Remaining 4700. Sell 4701 fails with 409; Sell 4700 succeeds.")
    void testSalesValidationAuthoritativeCalculation() {
        Long userId = createFarmer("FarmerSales");
        var farmer = farmerRepository.findByUserId(userId).orElseThrow();

        // 1. Create batch with initial 5000 birds
        BatchRequest batchReq = BatchRequest.builder()
                .farmId(farmer.getFarm().getId())
                .initialBirds(5000)
                .build();
        BatchResponse batch = batchService.createBatch(batchReq, userId);
        Long batchId = batch.getId();

        // Feed load so we can log daily record
        FeedLoadRequest feedReq = FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(20))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build();
        feedLoadService.addFeedLoad(batchId, feedReq, userId);

        // Record mortality = 100
        DailyRecordRequest recordReq = DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .morningMortality(30)
                .mortality(100)
                .feedConsumedKg(BigDecimal.valueOf(50))
                .avgWeightG(BigDecimal.valueOf(1200))
                .build();
        dailyRecordService.addDailyRecord(batchId, recordReq, userId);

        // Previous sales = 200
        SaleRequest prevSale = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader Alpha")
                .birdsSold(200)
                .totalWeightKg(BigDecimal.valueOf(400))
                .ratePerKg(BigDecimal.valueOf(3.5))
                .build();
        SaleResponse savedPrevSale = saleService.addSale(batchId, prevSale, userId);
        assertThat(savedPrevSale.getBirdsSold()).isEqualTo(200);

        // Remaining birds should now be 5000 - 100 - 200 = 4700
        // Attempt to sell 4701 -> MUST FAIL with InvalidSaleException (409 Conflict)
        SaleRequest invalidSale = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader Beta")
                .birdsSold(4701)
                .totalWeightKg(BigDecimal.valueOf(9402))
                .ratePerKg(BigDecimal.valueOf(3.5))
                .build();

        assertThatThrownBy(() -> saleService.addSale(batchId, invalidSale, userId))
                .isInstanceOf(InvalidSaleException.class)
                .hasMessage("Cannot sell 4701 birds. Only 4700 birds are currently available in this batch.");

        // Non-positive values validation
        SaleRequest zeroBirdsSale = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader Beta")
                .birdsSold(0)
                .totalWeightKg(BigDecimal.valueOf(100))
                .ratePerKg(BigDecimal.valueOf(3.5))
                .build();
        assertThatThrownBy(() -> saleService.addSale(batchId, zeroBirdsSale, userId))
                .isInstanceOf(IllegalArgumentException.class);

        // Attempt to sell 4700 -> MUST SUCCEED
        SaleRequest validSale = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader Gamma")
                .birdsSold(4700)
                .totalWeightKg(BigDecimal.valueOf(9400))
                .ratePerKg(BigDecimal.valueOf(3.5))
                .build();
        SaleResponse savedValidSale = saleService.addSale(batchId, validSale, userId);
        assertThat(savedValidSale.getBirdsSold()).isEqualTo(4700);

        // Now remaining birds is 0. Any further sale of 1 bird must fail.
        SaleRequest extraSale = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader Delta")
                .birdsSold(1)
                .totalWeightKg(BigDecimal.valueOf(2))
                .ratePerKg(BigDecimal.valueOf(3.5))
                .build();
        assertThatThrownBy(() -> saleService.addSale(batchId, extraSale, userId))
                .isInstanceOf(InvalidSaleException.class)
                .hasMessage("Cannot sell 1 birds. Only 0 birds are currently available in this batch.");
    }

    @Test
    @Transactional
    @DisplayName("Test 3-9: Writes against COMPLETED batch are rejected with 409 BatchCompletedException, while READS succeed")
    void testCompletedBatchWriteRejectionsAndReadSuccess() {
        Long userId = createFarmer("FarmerCompleted");
        var farmer = farmerRepository.findByUserId(userId).orElseThrow();

        // 1. Create and populate an active batch
        BatchRequest batchReq = BatchRequest.builder()
                .farmId(farmer.getFarm().getId())
                .initialBirds(2000)
                .build();
        BatchResponse batch = batchService.createBatch(batchReq, userId);
        Long batchId = batch.getId();

        // Add some initial data while active
        FeedLoadRequest feedReq = FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(10))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build();
        feedLoadService.addFeedLoad(batchId, feedReq, userId);

        DailyRecordRequest recordReq = DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .morningMortality(1)
                .mortality(5)
                .feedConsumedKg(BigDecimal.valueOf(50))
                .avgWeightG(BigDecimal.valueOf(800))
                .build();
        DailyRecordResponse savedRecord = dailyRecordService.addDailyRecord(batchId, recordReq, userId);

        ExpenseRequest expenseReq = new ExpenseRequest(
                LocalDate.now(),
                ExpenseCategory.FEED,
                BigDecimal.valueOf(500),
                "Initial feed purchase"
        );
        expenseService.addExpense(batchId, expenseReq, userId);

        VaccineRequest vaccineReq = new VaccineRequest(
                LocalDate.now(),
                "NDV + IB",
                "First week vaccination"
        );
        vaccineService.addVaccine(batchId, vaccineReq, userId);

        RemarkRequest remarkReq = RemarkRequest.builder()
                .remarkDate(LocalDate.now())
                .note("Flock health normal.")
                .build();
        remarkService.addRemark(batchId, remarkReq, userId);

        SaleRequest saleReq = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader X")
                .birdsSold(1995)
                .totalWeightKg(BigDecimal.valueOf(3990))
                .ratePerKg(BigDecimal.valueOf(3.0))
                .build();
        saleService.addSale(batchId, saleReq, userId);

        // 2. Complete/End the batch
        BatchResponse endedBatch = batchService.endBatch(batchId, userId);
        assertThat(endedBatch.getStatus()).isEqualTo(BatchStatus.COMPLETED);

        // 3. Attempt write operations on COMPLETED batch -> ALL MUST THROW BatchCompletedException (HTTP 409)

        // 3a. Sale write
        SaleRequest postEndSale = SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader Late")
                .birdsSold(50)
                .totalWeightKg(BigDecimal.valueOf(100))
                .ratePerKg(BigDecimal.valueOf(3.0))
                .build();
        assertThatThrownBy(() -> saleService.addSale(batchId, postEndSale, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot add sales. This batch is already completed.");

        // 3b. Feed write
        FeedLoadRequest postEndFeed = FeedLoadRequest.builder()
                .feedType("Finisher")
                .bags(BigDecimal.valueOf(5))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build();
        assertThatThrownBy(() -> feedLoadService.addFeedLoad(batchId, postEndFeed, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot add feed. This batch is already completed.");

        // 3c. Daily Record write (add)
        DailyRecordRequest postEndRecord = DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(2)
                .build();
        assertThatThrownBy(() -> dailyRecordService.addDailyRecord(batchId, postEndRecord, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot add daily records. This batch is already completed.");

        // 3d. Daily Record write (update)
        assertThatThrownBy(() -> dailyRecordService.updateDailyRecord(batchId, savedRecord.getId(), recordReq, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot update daily records. This batch is already completed.");

        // 3e. Daily Record write (delete)
        assertThatThrownBy(() -> dailyRecordService.deleteDailyRecord(batchId, savedRecord.getId(), userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot delete daily records. This batch is already completed.");

        // 3f. Expense write
        ExpenseRequest postEndExpense = new ExpenseRequest(
                LocalDate.now(),
                ExpenseCategory.MEDICINE,
                BigDecimal.valueOf(150),
                "Late medicine"
        );
        assertThatThrownBy(() -> expenseService.addExpense(batchId, postEndExpense, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot add expenses. This batch is already completed.");

        // 3g. Vaccine write
        VaccineRequest postEndVaccine = new VaccineRequest(
                LocalDate.now(),
                "Gumboro",
                "Late dose"
        );
        assertThatThrownBy(() -> vaccineService.addVaccine(batchId, postEndVaccine, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot add vaccines. This batch is already completed.");

        // 3h. Remark write
        RemarkRequest postEndRemark = RemarkRequest.builder()
                .remarkDate(LocalDate.now())
                .note("Late note")
                .build();
        assertThatThrownBy(() -> remarkService.addRemark(batchId, postEndRemark, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot add remarks. This batch is already completed.");

        // 3i. End batch again
        assertThatThrownBy(() -> batchService.endBatch(batchId, userId))
                .isInstanceOf(BatchCompletedException.class)
                .hasMessage("Cannot end batch. This batch is already completed.");

        // 4. READ Operations on COMPLETED batch MUST SUCCEED
        List<DailyRecordResponse> dailyRecords = dailyRecordService.getDailyRecords(batchId, userId, Role.FARMER);
        assertThat(dailyRecords).hasSize(1);

        List<SaleResponse> sales = saleService.getSales(batchId, userId, Role.FARMER);
        assertThat(sales).hasSize(1);

        List<ExpenseResponse> expenses = expenseService.getExpenses(batchId, userId, Role.FARMER);
        assertThat(expenses).hasSize(1);

        List<VaccineResponse> vaccines = vaccineService.getVaccines(batchId, userId, Role.FARMER);
        assertThat(vaccines).hasSize(1);

        List<RemarkResponse> remarks = remarkService.getRemarks(batchId, userId, Role.FARMER);
        assertThat(remarks).hasSize(1);

        List<FeedLoadResponse> feedLoads = feedLoadService.getFeedLoads(batchId, userId, Role.FARMER);
        assertThat(feedLoads).hasSize(1);

        FeedStockResponse feedStock = feedLoadService.getFeedStock(batchId, userId, Role.FARMER);
        assertThat(feedStock).isNotNull();
    }
}
