package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class SaleRequest {

    @NotNull(message = "saleDate is required")
    private LocalDate saleDate;

    private String traderName;

    @NotNull(message = "birdsSold is required")
    @Positive(message = "birdsSold must be positive")
    private Integer birdsSold;

    @NotNull(message = "totalWeightKg is required")
    @Positive(message = "totalWeightKg must be positive")
    private BigDecimal totalWeightKg;

    @NotNull(message = "ratePerKg is required")
    @Positive(message = "ratePerKg must be positive")
    private BigDecimal ratePerKg;

    private String liftingSignature;
}
