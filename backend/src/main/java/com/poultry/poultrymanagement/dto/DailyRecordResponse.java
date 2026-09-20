package com.poultry.poultrymanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyRecordResponse {
    private Long id;
    private Long batchId;
    private LocalDate recordDate;
    private Integer ageDays;
    private Integer morningMortality;
    private Integer mortality;
    private Integer cumulativeMortality;
    private BigDecimal cumulativeMortalityPct;
    private Integer remainingBirds;
    private String feedType;
    private BigDecimal bagCapacityKg;
    private BigDecimal minFeedIntakeG;
    private BigDecimal cumulativeFeedMinKg;
    private BigDecimal cumulativeFeedActualKg;
    private BigDecimal feedConsumedKg;
    private BigDecimal minBodyWeightG;
    private BigDecimal avgWeightG;
    private BigDecimal standardFcr;
    private BigDecimal fcr;
    private BigDecimal feedBagsConsumed;
    private BigDecimal feedBagsTotal;
    private BigDecimal feedBagsClosingStock;
    private String signature;
    private String notes;
    private LocalDateTime createdAt;
}
