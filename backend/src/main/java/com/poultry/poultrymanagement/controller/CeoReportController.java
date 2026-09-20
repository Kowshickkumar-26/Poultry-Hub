package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.CeoMultiFarmReportResponse;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.service.CeoReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/ceo/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CEO')")
public class CeoReportController {

    private final CeoReportService ceoReportService;

    @GetMapping("/overview")
    public CeoMultiFarmReportResponse getMultiFarmReport(
            @RequestParam(required = false) Long farmId,
            @RequestParam(required = false) BatchStatus batchStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ceoReportService.generateMultiFarmReport(farmId, batchStatus, startDate, endDate);
    }
}
