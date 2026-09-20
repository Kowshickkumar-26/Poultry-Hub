package com.poultry.poultrymanagement.dto;

import com.poultry.poultrymanagement.entity.BatchStatus;
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
public class BatchResponse {
    private Long id;
    private String batchCode;
    private Long farmId;
    private String farmName;
    private Long farmerId;
    private String farmerName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer initialBirds;
    private BatchStatus status;
}
