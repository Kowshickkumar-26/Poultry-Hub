package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotBlank;
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
public class FeedLoadRequest {

    // Optional -- automatically assigned to current date if null
    private LocalDate loadDate;

    @NotBlank(message = "feedType is required")
    private String feedType;

    @NotNull(message = "bags is required")
    @Positive(message = "bags must be positive")
    private BigDecimal bags;

    // Optional -- defaults to 50kg if not provided. Supported: 50, 70, etc.
    @Positive(message = "weightPerBagKg must be positive")
    private BigDecimal weightPerBagKg;
}
