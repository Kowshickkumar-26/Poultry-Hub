package com.poultry.poultrymanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedStockResponse {
    private Long batchId;
    private BigDecimal currentBags;
    private BigDecimal currentStockKg;
    private BigDecimal totalLoadedKg;
    private BigDecimal totalConsumedKg;
    private BigDecimal preStarterLoadedKg;
    private BigDecimal starterLoadedKg;
    private BigDecimal finisherLoadedKg;
    private BigDecimal preStarterConsumedKg;
    private BigDecimal starterConsumedKg;
    private BigDecimal finisherConsumedKg;
    private List<FeedInventoryItemDto> inventory;
    private LocalDateTime lastUpdated;
}
