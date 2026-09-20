package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.BatchRequest;
import com.poultry.poultrymanagement.dto.BatchResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.BatchService;
import com.poultry.poultrymanagement.service.report.BatchClosingReportPdfService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;
    private final BatchClosingReportPdfService batchClosingReportPdfService;

    // FARMER only: create a new batch tied to their own farmer profile.
    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public BatchResponse createBatch(
            @Valid @RequestBody BatchRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return batchService.createBatch(request, principal.getId());
    }

    // FARMER only: close their own active batch.
    @PutMapping("/{id}/end")
    @PreAuthorize("hasRole('FARMER')")
    public BatchResponse endBatch(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return batchService.endBatch(id, principal.getId());
    }

    // FARMER's own current active batch, or null if none exists.
    @GetMapping("/active")
    @PreAuthorize("hasRole('FARMER')")
    public BatchResponse getActiveBatch(@AuthenticationPrincipal UserPrincipal principal) {
        return batchService.getActiveBatch(principal.getId());
    }

    // FARMER's own completed/historical batches, most recent first.
    @GetMapping("/history")
    @PreAuthorize("hasRole('FARMER')")
    public List<BatchResponse> getBatchHistory(@AuthenticationPrincipal UserPrincipal principal) {
        return batchService.getBatchHistory(principal.getId());
    }

    @GetMapping("/all-active")
    @PreAuthorize("hasRole('CEO')")
    public List<BatchResponse> getAllActiveBatches() {
        return batchService.getAllActiveBatches();
    }

    @GetMapping("/all-completed")
    @PreAuthorize("hasRole('CEO')")
    public List<BatchResponse> getAllCompletedBatches() {
        return batchService.getAllCompletedBatches();
    }

    // CEO can monitor all batches; FARMER access is limited by ownership.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public BatchResponse getBatchById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return batchService.getBatchById(id, principal.getId(), principal.getUser().getRole());
    }

    // Generate and download comprehensive Batch Closing Report PDF for completed batches
    @GetMapping("/{id}/closing-report")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public ResponseEntity<byte[]> getBatchClosingReport(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        var batch = batchService.getAccessibleBatch(id, principal.getId(), principal.getUser().getRole());
        byte[] pdfBytes = batchClosingReportPdfService.generateClosingReport(
                id,
                principal.getId(),
                principal.getUser().getRole()
        );

        String filename = String.format("Batch-%s-Closing-Report.pdf", batch.getBatchCode());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION)
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfBytes.length)
                .body(pdfBytes);
    }
}
