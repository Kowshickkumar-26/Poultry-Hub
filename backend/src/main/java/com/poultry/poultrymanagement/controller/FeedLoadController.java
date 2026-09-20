package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.FeedLoadRequest;
import com.poultry.poultrymanagement.dto.FeedLoadResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.FeedLoadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches/{batchId}/feed-loads")
@RequiredArgsConstructor
public class FeedLoadController {

    private final FeedLoadService feedLoadService;

    // FARMER only: log a new feed delivery for their own batch.
    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public FeedLoadResponse addFeedLoad(
            @PathVariable Long batchId,
            @Valid @RequestBody FeedLoadRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return feedLoadService.addFeedLoad(batchId, request, principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<FeedLoadResponse> getFeedLoads(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return feedLoadService.getFeedLoads(batchId, principal.getId(), principal.getUser().getRole());
    }
}
