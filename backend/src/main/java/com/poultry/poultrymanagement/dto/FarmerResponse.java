package com.poultry.poultrymanagement.dto;

import com.poultry.poultrymanagement.entity.BatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmerResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private LocalDate joinedDate;

    // Farm details
    private Long farmId;
    private String farmName;
    private String farmLocation;
    private String farmDescription;
    private LocalDateTime farmCreatedAt;

    // Active batch summary (if any)
    private Long activeBatchId;
    private String activeBatchCode;
    private BatchStatus activeBatchStatus;
    private LocalDate activeBatchStartDate;
    private Integer initialBirds;
    private Integer remainingBirds;
    private Integer totalMortality;
    private BigDecimal feedStockKg;

    // Batch counts
    private Integer totalBatchesCount;
    private Integer completedBatchesCount;

    // Batch History for CEO drilldown
    private List<BatchHistoryItem> batchHistory;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BatchHistoryItem {
        private Long id;
        private String batchCode;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer initialBirds;
        private Integer finalRemainingBirds;
        private Integer totalMortality;
        private BatchStatus status;
    }
}
