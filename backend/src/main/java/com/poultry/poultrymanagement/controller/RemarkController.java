package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.RemarkRequest;
import com.poultry.poultrymanagement.dto.RemarkResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.RemarkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches/{batchId}/remarks")
@RequiredArgsConstructor
public class RemarkController {

    private final RemarkService remarkService;

    // Ownership check happens inside the service layer.
    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public RemarkResponse addRemark(
            @PathVariable Long batchId,
            @Valid @RequestBody RemarkRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return remarkService.addRemark(batchId, request, principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<RemarkResponse> getRemarks(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return remarkService.getRemarks(batchId, principal.getId(), principal.getUser().getRole());
    }
}
