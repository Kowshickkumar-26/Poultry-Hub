package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchRequest {

    @NotNull(message = "farmId is required")
    private Long farmId;

    @NotNull(message = "initialBirds is required")
    @Positive(message = "initialBirds must be positive")
    private Integer initialBirds;
}
