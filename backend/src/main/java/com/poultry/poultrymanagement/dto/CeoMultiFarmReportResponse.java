package com.poultry.poultrymanagement.dto;

import com.poultry.poultrymanagement.entity.BatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CeoMultiFarmReportResponse {

    @Builder.Default
    private NetworkKpis networkKpis = new NetworkKpis();

    @Builder.Default
    private List<FarmComparisonItem> farmRankings = new ArrayList<>();

    @Builder.Default
    private List<BatchReportItem> batchReports = new ArrayList<>();

    @Builder.Default
    private List<HeatmapCellItem> fcrHeatmap = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NetworkKpis {
        private int totalFarms;
        private int totalActiveBatches;
        private int totalCompletedBatches;
        private int totalBatches;
        private int totalInitialBirds;
        private int totalRemainingBirds;
        private int totalMortality;
        private BigDecimal networkMortalityPct;
        private BigDecimal averageFcr;
        private BigDecimal totalFeedConsumedKg;
        private BigDecimal totalRevenue;
        private BigDecimal averageBirdWeightG;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FarmComparisonItem {
        private Long farmId;
        private String farmName;
        private String farmLocation;
        private Long farmerId;
        private String farmerName;
        private int activeBatchesCount;
        private int completedBatchesCount;
        private int totalBatchesCount;
        private int totalBirds;
        private int remainingBirds;
        private int totalMortality;
        private BigDecimal mortalityPct;
        private BigDecimal avgWeightG;
        private BigDecimal avgFcr;
        private BigDecimal totalFeedConsumedKg;
        private BigDecimal totalRevenue;
        private String performanceStatus; // "EXCELLENT", "GOOD", "NEEDS_ATTENTION", "NO_DATA"
        private String performanceNote;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BatchReportItem {
        private Long batchId;
        private String batchCode;
        private Long farmId;
        private String farmName;
        private Long farmerId;
        private String farmerName;
        private BatchStatus status;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer initialBirds;
        private Integer remainingBirds;
        private Integer totalMortality;
        private BigDecimal mortalityPct;
        private BigDecimal latestAvgWeightG;
        private BigDecimal latestFcr;
        private BigDecimal totalFeedConsumedKg;
        private BigDecimal totalRevenue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HeatmapCellItem {
        private Long farmId;
        private String farmName;
        private Long batchId;
        private String batchCode;
        private LocalDate recordDate;
        private Integer dayNumber;
        private BigDecimal fcr;
        private String fcrCategory; // "EXCELLENT", "NORMAL", "NEEDS_ATTENTION", "NO_DATA"
        private Integer mortality;
        private BigDecimal feedConsumedKg;
        private BigDecimal avgWeightG;
    }
}
