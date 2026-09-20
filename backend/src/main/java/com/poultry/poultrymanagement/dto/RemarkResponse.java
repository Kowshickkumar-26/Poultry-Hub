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
public class RemarkResponse {
    private Long id;
    private Long batchId;
    private LocalDate remarkDate;
    private String note;
    private Long createdByUserId;
    private String createdByName;
    private String createdByRole;
}
