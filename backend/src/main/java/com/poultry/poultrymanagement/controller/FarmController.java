package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.FarmRequest;
import com.poultry.poultrymanagement.dto.FarmResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.FarmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/farms")
@RequiredArgsConstructor
public class FarmController {

    private final FarmService farmService;

    // CEO only: create a new farm.
    @PostMapping
    @PreAuthorize("hasRole('CEO')")
    public FarmResponse createFarm(@Valid @RequestBody FarmRequest request) {
        return farmService.createFarm(request);
    }

    // FARMER only: farmer creates their own farm and links their profile
    @PostMapping("/my-farm")
    @PreAuthorize("hasRole('FARMER')")
    public FarmResponse createMyFarm(
            @Valid @RequestBody FarmRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return farmService.createFarmAndLinkFarmer(request, principal.getId());
    }

    // FARMER only: get the logged-in farmer's farm details
    @GetMapping("/me")
    @PreAuthorize("hasRole('FARMER')")
    public FarmResponse getMyFarm(@AuthenticationPrincipal UserPrincipal principal) {
        return farmService.getMyFarm(principal.getId());
    }

    // FARMER only: update the logged-in farmer's farm details
    @PutMapping("/me")
    @PreAuthorize("hasRole('FARMER')")
    public FarmResponse updateMyFarm(
            @Valid @RequestBody FarmRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return farmService.updateMyFarm(principal.getId(), request);
    }

    // CEO sees all farms.
    @GetMapping
    @PreAuthorize("hasRole('CEO')")
    public List<FarmResponse> getFarms() {
        return farmService.getAllFarms();
    }

    // Retrieve farm by ID (CEO or owner farmer)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CEO', 'FARMER')")
    public FarmResponse getFarmById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return farmService.getFarmById(id, principal.getId(), principal.getUser().getRole());
    }
}
