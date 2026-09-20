package com.poultry.poultrymanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedInventoryItemDto {
    private String feedType;
    private String feedTypeDisplay;
    private BigDecimal bagCapacityKg;
    private BigDecimal loadedBags;
    private BigDecimal consumedBags;
    private BigDecimal availableBags;
    private BigDecimal availableKg;
    private String stockStatus; // "NORMAL", "LOW_STOCK", "OUT_OF_STOCK"
}
