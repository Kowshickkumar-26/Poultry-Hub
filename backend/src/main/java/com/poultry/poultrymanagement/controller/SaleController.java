package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.SaleRequest;
import com.poultry.poultrymanagement.dto.SaleResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches/{batchId}/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public SaleResponse addSale(
            @PathVariable Long batchId,
            @Valid @RequestBody SaleRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return saleService.addSale(batchId, request, principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<SaleResponse> getSales(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return saleService.getSales(batchId, principal.getId(), principal.getUser().getRole());
    }
}
