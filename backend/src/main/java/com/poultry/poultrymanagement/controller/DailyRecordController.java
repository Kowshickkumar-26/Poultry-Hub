package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.DailyRecordRequest;
import com.poultry.poultrymanagement.dto.DailyRecordResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.DailyRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches/{batchId}/daily-records")
@RequiredArgsConstructor
public class DailyRecordController {

    private final DailyRecordService dailyRecordService;

    // FARMER only: add today's entry for their own batch.
    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public DailyRecordResponse addDailyRecord(
            @PathVariable Long batchId,
            @Valid @RequestBody DailyRecordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return dailyRecordService.addDailyRecord(batchId, request, principal.getId());
    }

    // Any authenticated role can view the full daily history for a batch
    // (farmer for their own dashboard, CEO for monitoring).
    @GetMapping
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<DailyRecordResponse> getDailyRecords(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return dailyRecordService.getDailyRecords(batchId, principal.getId(), principal.getUser().getRole());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('FARMER')")
    public DailyRecordResponse updateDailyRecord(
            @PathVariable Long batchId,
            @PathVariable Long id,
            @Valid @RequestBody DailyRecordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return dailyRecordService.updateDailyRecord(batchId, id, request, principal.getId());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('FARMER')")
    public void deleteDailyRecord(
            @PathVariable Long batchId,
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        dailyRecordService.deleteDailyRecord(batchId, id, principal.getId());
    }
}
