package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class RemarkRequest {

    @NotNull(message = "remarkDate is required")
    private LocalDate remarkDate;

    @NotBlank(message = "note is required")
    private String note;
}
