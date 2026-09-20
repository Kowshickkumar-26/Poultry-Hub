package com.poultry.poultrymanagement.dto;

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
public class VaccineResponse {
    private Long id;
    private Long batchId;
    private LocalDate givenDate;
    private String vaccineName;
    private Integer ageDays;
    private String remarks;
}
