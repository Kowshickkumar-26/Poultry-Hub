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
public class FeedLoadResponse {
    private Long id;
    private Long batchId;
    private LocalDate loadDate;
    private String feedType;
    private BigDecimal bags;
    private BigDecimal weightPerBagKg;
    private BigDecimal totalWeightKg;
    private LocalDateTime createdAt;
}
