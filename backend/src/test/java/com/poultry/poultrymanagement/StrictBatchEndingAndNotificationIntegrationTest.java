package com.poultry.poultrymanagement;

import com.poultry.poultrymanagement.controller.AuthController;
import com.poultry.poultrymanagement.dto.*;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.exception.BatchEndingRemainingBirdsException;
import com.poultry.poultrymanagement.exception.InvalidMortalityException;
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
class StrictBatchEndingAndNotificationIntegrationTest {

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
    private NotificationService notificationService;

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
    @DisplayName("Strict Batch Ending Rule & Live Birds Consistency: Remaining Birds > 0 Rejection, Mortality/Sale Validations, and End Batch on 0")
    void testStrictBatchEndingAndBirdCountIntegrity() {
        Long farmerUserId = createFarmer("FarmerStrictBatch");
        var farmer = farmerRepository.findByUserId(farmerUserId).orElseThrow();

        // 1. Create Active Batch with 1000 birds
        BatchRequest batchReq = BatchRequest.builder()
                .farmId(farmer.getFarm().getId())
                .initialBirds(1000)
                .build();
        BatchResponse batch = batchService.createBatch(batchReq, farmerUserId);
        Long batchId = batch.getId();

        // Load Feed: 50 bags of Starter 50kg
        feedLoadService.addFeedLoad(batchId, FeedLoadRequest.builder()
                .loadDate(LocalDate.now())
                .feedType("Starter")
                .bags(BigDecimal.valueOf(50))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), farmerUserId);

        // 2. Attempt to end batch immediately with 1000 remaining birds -> MUST FAIL with BatchEndingRemainingBirdsException
        assertThatThrownBy(() -> batchService.endBatch(batchId, farmerUserId))
                .isInstanceOf(BatchEndingRemainingBirdsException.class)
                .hasMessageContaining("1000 birds remaining");

        // 3. Record 50 mortality (Remaining = 950)
        dailyRecordService.addDailyRecord(batchId, DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(50)
                .feedType("Starter")
                .bagCapacityKg(BigDecimal.valueOf(50))
                .feedBagsConsumed(BigDecimal.valueOf(2))
                .avgWeightG(BigDecimal.valueOf(200))
                .build(), farmerUserId);

        // Attempt to end batch -> MUST FAIL (950 remaining)
        assertThatThrownBy(() -> batchService.endBatch(batchId, farmerUserId))
                .isInstanceOf(BatchEndingRemainingBirdsException.class)
                .hasMessageContaining("950 birds remaining");

        // 4. Record partial sale: 400 birds (Remaining = 550)
        saleService.addSale(batchId, SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Global Trader")
                .birdsSold(400)
                .totalWeightKg(BigDecimal.valueOf(800))
                .ratePerKg(BigDecimal.valueOf(120))
                .build(), farmerUserId);

        // Attempt to sell 600 birds (exceeds available 550) -> MUST FAIL with InvalidSaleException
        assertThatThrownBy(() -> saleService.addSale(batchId, SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Global Trader")
                .birdsSold(600)
                .totalWeightKg(BigDecimal.valueOf(1200))
                .ratePerKg(BigDecimal.valueOf(120))
                .build(), farmerUserId))
                .isInstanceOf(InvalidSaleException.class)
                .hasMessageContaining("550 birds are currently available");

        // Attempt to end batch -> MUST FAIL (550 remaining)
        assertThatThrownBy(() -> batchService.endBatch(batchId, farmerUserId))
                .isInstanceOf(BatchEndingRemainingBirdsException.class)
                .hasMessageContaining("550 birds remaining");

        // 5. Sell remaining 550 birds (Remaining = 0)
        saleService.addSale(batchId, SaleRequest.builder()
                .saleDate(LocalDate.now())
                .traderName("Final Trader")
                .birdsSold(550)
                .totalWeightKg(BigDecimal.valueOf(1100))
                .ratePerKg(BigDecimal.valueOf(125))
                .build(), farmerUserId);

        // 6. End batch now that remaining birds == 0 -> MUST SUCCEED
        BatchResponse completedBatch = batchService.endBatch(batchId, farmerUserId);
        assertThat(completedBatch.getStatus()).isEqualTo(BatchStatus.COMPLETED);
        assertThat(completedBatch.getEndDate()).isNotNull();
    }

    @Test
    @Transactional
    @DisplayName("Notification System: Real-time Alerts, Feed Low / Out of Stock, Batch Ready, and Read Status Tracking")
    void testNotificationSystem() {
        Long farmerUserId = createFarmer("FarmerNotificationTest");
        var farmer = farmerRepository.findByUserId(farmerUserId).orElseThrow();

        // 1. Create Active Batch
        BatchRequest batchReq = BatchRequest.builder()
                .farmId(farmer.getFarm().getId())
                .initialBirds(500)
                .build();
        BatchResponse batch = batchService.createBatch(batchReq, farmerUserId);
        Long batchId = batch.getId();

        // Load small feed (2 bags of Pre-Starter 50kg)
        feedLoadService.addFeedLoad(batchId, FeedLoadRequest.builder()
                .loadDate(LocalDate.now())
                .feedType("Pre-Starter")
                .bags(BigDecimal.valueOf(2))
                .weightPerBagKg(BigDecimal.valueOf(50))
                .build(), farmerUserId);

        // Check Notifications: Should show Low Feed Stock and Daily Record Missing
        List<NotificationDto> notifications = notificationService.getNotifications(farmerUserId, Role.FARMER);
        assertThat(notifications).isNotEmpty();

        boolean hasMissingDailyRecord = notifications.stream().anyMatch(n -> "DAILY_RECORD_MISSING".equals(n.getType()));
        assertThat(hasMissingDailyRecord).isTrue();

        boolean hasFeedLow = notifications.stream().anyMatch(n -> "FEED_LOW".equals(n.getType()));
        assertThat(hasFeedLow).isTrue();

        // 2. Add Daily Record consuming 2 bags (making stock 0 = out of stock) and recording 500 mortality (remaining = 0)
        dailyRecordService.addDailyRecord(batchId, DailyRecordRequest.builder()
                .recordDate(LocalDate.now())
                .mortality(500)
                .feedType("Pre-Starter")
                .bagCapacityKg(BigDecimal.valueOf(50))
                .feedBagsConsumed(BigDecimal.valueOf(2))
                .avgWeightG(BigDecimal.valueOf(500))
                .build(), farmerUserId);

        // Refresh Notifications
        notifications = notificationService.getNotifications(farmerUserId, Role.FARMER);

        // Check Batch Ready to End notification
        boolean hasBatchReady = notifications.stream().anyMatch(n -> "BATCH_READY_TO_END".equals(n.getType()));
        assertThat(hasBatchReady).isTrue();

        // Check Feed Out of Stock notification
        boolean hasFeedEmpty = notifications.stream().anyMatch(n -> "FEED_OUT_OF_STOCK".equals(n.getType()));
        assertThat(hasFeedEmpty).isTrue();

        // Check Read Tracking
        String firstNotifId = notifications.get(0).getId();
        notificationService.markAsRead(farmerUserId, firstNotifId);

        notifications = notificationService.getNotifications(farmerUserId, Role.FARMER);
        NotificationDto firstNotif = notifications.stream().filter(n -> n.getId().equals(firstNotifId)).findFirst().orElseThrow();
        assertThat(firstNotif.isRead()).isTrue();

        // Mark all as read
        notificationService.markAllAsRead(farmerUserId, Role.FARMER);
        notifications = notificationService.getNotifications(farmerUserId, Role.FARMER);
        assertThat(notifications).allMatch(NotificationDto::isRead);
    }
}
