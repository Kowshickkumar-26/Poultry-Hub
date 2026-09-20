package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyRecordRequest {

    // Optional: Defaults to current date on backend if not supplied
    private LocalDate recordDate;

    @PositiveOrZero
    private Integer morningMortality;

    @NotNull(message = "mortality is required")
    @PositiveOrZero(message = "mortality cannot be negative")
    private Integer mortality;

    // Feed inputs
    private String feedType;

    @PositiveOrZero(message = "feedBagsConsumed cannot be negative")
    private BigDecimal feedBagsConsumed;

    @Positive(message = "bagCapacityKg must be positive")
    private BigDecimal bagCapacityKg;

    @PositiveOrZero(message = "feedConsumedKg cannot be negative")
    private BigDecimal feedConsumedKg;

    // Weight inputs
    @PositiveOrZero(message = "avgWeightG cannot be negative")
    private BigDecimal avgWeightG;

    // Optional legacy / standard fields
    private BigDecimal minFeedIntakeG;
    private BigDecimal cumulativeFeedMinKg;
    private BigDecimal cumulativeFeedActualKg;
    private BigDecimal minBodyWeightG;
    private BigDecimal standardFcr;
    private BigDecimal feedBagsTotal;
    private BigDecimal feedBagsClosingStock;
    private String signature;
    private String notes;
}
