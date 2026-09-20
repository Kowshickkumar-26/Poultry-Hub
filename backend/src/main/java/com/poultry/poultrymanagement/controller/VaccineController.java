package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.VaccineRequest;
import com.poultry.poultrymanagement.dto.VaccineResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.VaccineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches/{batchId}/vaccines")
@RequiredArgsConstructor
public class VaccineController {

    private final VaccineService vaccineService;

    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public VaccineResponse addVaccine(
            @PathVariable Long batchId,
            @Valid @RequestBody VaccineRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return vaccineService.addVaccine(batchId, request, principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<VaccineResponse> getVaccines(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return vaccineService.getVaccines(batchId, principal.getId(), principal.getUser().getRole());
    }
}
