package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.controller.CeoReportController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class CeoMultiFarmReportIntegrationTest {

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
    private CeoReportService ceoReportService;

    @Autowired
    private CeoReportController ceoReportController;

    @Test
    @Transactional
    @WithMockUser(roles = "CEO")
    @DisplayName("CEO Multi-Farm Report Aggregates Metrics, Rankings, and FCR Heatmap Correctly")
    void testCeoMultiFarmReportAggregationAndCalculations() {
        long timestamp = System.currentTimeMillis();

        // 1. Setup Farm 1 (Alice)
        String emailA = "ceo-report-a-" + timestamp + "@poultry.com";
        ResponseEntity<AuthResponse> resA = authController.register(RegisterRequest.builder()
                .name("Alice Farmer")
                .email(emailA)
                .password("password123")
                .role(Role.FARMER)
                .phone("1112223333")
                .build());
        Long userAId = resA.getBody().getUserId();
        var farmerA = farmerRepository.findByUserId(userAId).orElseThrow();

        BatchResponse batchA = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerA.getFarm().getId())
                .initialBirds(5000)
                .build(), userAId);

        // Load feed for Farm 1: 20 bags x 50kg = 1000kg
        feedLoadService.addFeedLoad(batchA.getId(), FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(20))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userAId);

        // Daily record for Farm 1: 50 mortality, 500kg feed, avgWeight 1600g
        dailyRecordService.addDailyRecord(batchA.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(50)
                .feedConsumedKg(BigDecimal.valueOf(500))
                .avgWeightG(BigDecimal.valueOf(1600))
                .build(), userAId);

        // Sale for Farm 1: 200 birds, $1000 revenue
        saleService.addSale(batchA.getId(), SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Trader A")
                .birdsSold(200)
                .totalWeightKg(BigDecimal.valueOf(400))
                .ratePerKg(BigDecimal.valueOf(2.50))
                .build(), userAId);

        // 2. Setup Farm 2 (Bob)
        String emailB = "ceo-report-b-" + timestamp + "@poultry.com";
        ResponseEntity<AuthResponse> resB = authController.register(RegisterRequest.builder()
                .name("Bob Farmer")
                .email(emailB)
                .password("password123")
                .role(Role.FARMER)
                .phone("4445556666")
                .build());
        Long userBId = resB.getBody().getUserId();
        var farmerB = farmerRepository.findByUserId(userBId).orElseThrow();

        BatchResponse batchB = batchService.createBatch(BatchRequest.builder()
                .farmId(farmerB.getFarm().getId())
                .initialBirds(4000)
                .build(), userBId);

        // Load feed for Farm 2: 20 bags x 50kg = 1000kg
        feedLoadService.addFeedLoad(batchB.getId(), FeedLoadRequest.builder()
                .feedType("Starter")
                .bags(BigDecimal.valueOf(20))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), userBId);

        // Daily record for Farm 2: 20 mortality, 400kg feed, avgWeight 1700g
        dailyRecordService.addDailyRecord(batchB.getId(), DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(20)
                .feedConsumedKg(BigDecimal.valueOf(400))
                .avgWeightG(BigDecimal.valueOf(1700))
                .build(), userBId);

        // 3. Query CeoReportController
        CeoMultiFarmReportResponse report = ceoReportController.getMultiFarmReport(null, null, null, null);

        // Assert Network KPIs
        assertThat(report.getNetworkKpis().getTotalFarms()).isGreaterThanOrEqualTo(2);
        assertThat(report.getNetworkKpis().getTotalActiveBatches()).isGreaterThanOrEqualTo(2);
        assertThat(report.getNetworkKpis().getTotalInitialBirds()).isGreaterThanOrEqualTo(9000);
        assertThat(report.getNetworkKpis().getTotalMortality()).isGreaterThanOrEqualTo(70);
        assertThat(report.getNetworkKpis().getTotalFeedConsumedKg()).isGreaterThanOrEqualTo(BigDecimal.valueOf(900));
        assertThat(report.getNetworkKpis().getTotalRevenue()).isGreaterThanOrEqualTo(BigDecimal.valueOf(1000));

        // Assert Farm Rankings
        assertThat(report.getFarmRankings()).isNotEmpty();
        var farmARanking = report.getFarmRankings().stream()
                .filter(f -> f.getFarmId().equals(farmerA.getFarm().getId()))
                .findFirst()
                .orElseThrow();
        assertThat(farmARanking.getTotalBirds()).isEqualTo(5000);
        assertThat(farmARanking.getRemainingBirds()).isEqualTo(4750); // 5000 - 50 mort - 200 sold = 4750
        assertThat(farmARanking.getTotalMortality()).isEqualTo(50);
        assertThat(farmARanking.getTotalRevenue()).isEqualByComparingTo(BigDecimal.valueOf(1000.00));
        assertThat(farmARanking.getPerformanceStatus()).isNotNull();

        // Assert Heatmap
        assertThat(report.getFcrHeatmap()).isNotEmpty();

        // 4. Test Filtering by farm
        CeoMultiFarmReportResponse filteredReport = ceoReportController.getMultiFarmReport(farmerA.getFarm().getId(), null, null, null);
        assertThat(filteredReport.getFarmRankings()).hasSize(1);
        assertThat(filteredReport.getFarmRankings().get(0).getFarmId()).isEqualTo(farmerA.getFarm().getId());

        // 5. Test Filtering by status
        CeoMultiFarmReportResponse activeReport = ceoReportController.getMultiFarmReport(null, BatchStatus.ACTIVE, null, null);
        assertThat(activeReport.getBatchReports()).allMatch(b -> b.getStatus() == BatchStatus.ACTIVE);
    }

    @Test
    @WithMockUser(roles = "FARMER")
    @DisplayName("Farmer Role Cannot Access CEO Report Controller (Authorization Denied)")
    void testFarmerAccessDeniedToCeoReports() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> ceoReportController.getMultiFarmReport(null, null, null, null))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }
}
