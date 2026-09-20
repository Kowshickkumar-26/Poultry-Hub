package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VaccineRequest {

    private LocalDate givenDate;

    @NotBlank(message = "vaccineName is required")
    private String vaccineName;

    private String remarks;
}
