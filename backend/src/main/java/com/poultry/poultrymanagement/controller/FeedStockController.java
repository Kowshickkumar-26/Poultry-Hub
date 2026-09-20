package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.FeedStockResponse;
import com.poultry.poultrymanagement.service.FeedLoadService;
import com.poultry.poultrymanagement.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/batches/{batchId}/feed-stock")
@RequiredArgsConstructor
public class FeedStockController {

    private final FeedLoadService feedLoadService;

    // Current running feed stock balance.
    @GetMapping
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public FeedStockResponse getFeedStock(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return feedLoadService.getFeedStock(batchId, principal.getId(), principal.getUser().getRole());
    }
}
