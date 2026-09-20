package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.ExpenseCategoryTotal;
import com.poultry.poultrymanagement.dto.ExpenseRequest;
import com.poultry.poultrymanagement.dto.ExpenseResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches/{batchId}/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    @PreAuthorize("hasRole('FARMER')")
    public ExpenseResponse addExpense(
            @PathVariable Long batchId,
            @Valid @RequestBody ExpenseRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return expenseService.addExpense(batchId, request, principal.getId());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<ExpenseResponse> getExpenses(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return expenseService.getExpenses(batchId, principal.getId(), principal.getUser().getRole());
    }

    // Category-wise totals -- feeds the profitability breakdown chart later.
    @GetMapping("/breakdown")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<ExpenseCategoryTotal> getExpenseBreakdown(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return expenseService.getExpenseBreakdown(batchId, principal.getId(), principal.getUser().getRole());
    }
}
