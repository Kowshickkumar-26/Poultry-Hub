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
public class SaleResponse {
    private Long id;
    private Long batchId;
    private LocalDate saleDate;
    private String traderName;
    private Integer birdsSold;
    private BigDecimal totalWeightKg;
    private BigDecimal avgWeightPerBirdKg; // computed by MySQL
    private BigDecimal ratePerKg;
    private String liftingSignature;
    private BigDecimal revenue;            // computed by MySQL
    private LocalDateTime createdAt;
}
