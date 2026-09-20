package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.FarmerProfileUpdateRequest;
import com.poultry.poultrymanagement.dto.FarmerRequest;
import com.poultry.poultrymanagement.dto.FarmerResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.FarmerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/farmers")
@RequiredArgsConstructor
public class FarmerController {

    private final FarmerService farmerService;

    // CEO only: link a registered FARMER-role user to a farm.
    @PostMapping
    @PreAuthorize("hasRole('CEO')")
    public FarmerResponse createFarmerProfile(@Valid @RequestBody FarmerRequest request) {
        return farmerService.createFarmerProfile(request);
    }

    // List all farmers (CEO overview)
    @GetMapping
    @PreAuthorize("hasRole('CEO')")
    public List<FarmerResponse> getAllFarmers() {
        return farmerService.getAllFarmers();
    }

    // CEO only: get complete farmer details by farmer ID (including batch history & active flock metrics)
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CEO')")
    public FarmerResponse getFarmerById(@PathVariable Long id) {
        return farmerService.getFarmerDetailsById(id);
    }

    // CEO: list all farmers on a given farm.
    @GetMapping("/by-farm/{farmId}")
    @PreAuthorize("hasRole('CEO')")
    public List<FarmerResponse> getFarmersByFarm(
            @PathVariable Long farmId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return farmerService.getFarmersByFarm(farmId, principal.getId(), principal.getUser().getRole());
    }

    // The logged-in farmer's own complete profile and live stats.
    @GetMapping("/me")
    @PreAuthorize("hasRole('FARMER')")
    public FarmerResponse getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return farmerService.getFarmerByUserId(principal.getId());
    }

    // The logged-in farmer updates their allowed profile fields (name, phone, farm details).
    @PutMapping("/me")
    @PreAuthorize("hasRole('FARMER')")
    public FarmerResponse updateMyProfile(
            @Valid @RequestBody FarmerProfileUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return farmerService.updateFarmerProfile(principal.getId(), request);
    }
}
