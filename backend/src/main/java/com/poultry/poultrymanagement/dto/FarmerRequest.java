package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FarmerRequest {

    @NotNull(message = "userId is required")
    private Long userId;

    @NotNull(message = "farmId is required")
    private Long farmId;
}
