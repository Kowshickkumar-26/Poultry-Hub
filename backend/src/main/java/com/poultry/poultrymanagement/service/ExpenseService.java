package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.ExpenseCategoryTotal;
import com.poultry.poultrymanagement.dto.ExpenseRequest;
import com.poultry.poultrymanagement.dto.ExpenseResponse;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Expense;
import com.poultry.poultrymanagement.entity.ExpenseCategory;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.ExpenseRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final BatchRepository batchRepository;
    private final FarmerRepository farmerRepository;
    private final BatchService batchService;

    @Transactional
    public ExpenseResponse addExpense(Long batchId, ExpenseRequest request, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);

        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot add expenses. This batch is already completed.");
        }

        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Expenses can only be added to an ACTIVE batch");
        }

        Expense expense = Expense.builder()
                .batch(batch)
                .expenseDate(request.getExpenseDate())
                .category(request.getCategory())
                .amount(request.getAmount())
                .description(request.getDescription())
                .build();

        return toResponse(expenseRepository.save(expense));
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpenses(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);
        return expenseRepository.findByBatchIdOrderByExpenseDateAsc(batchId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExpenseCategoryTotal> getExpenseBreakdown(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);
        List<Expense> all = expenseRepository.findByBatchIdOrderByExpenseDateAsc(batchId);

        return Arrays.stream(ExpenseCategory.values())
                .map(category -> {
                    BigDecimal total = all.stream()
                            .filter(e -> e.getCategory() == category)
                            .map(Expense::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return ExpenseCategoryTotal.builder()
                            .category(category)
                            .total(total)
                            .build();
                })
                .toList();
    }

    private Batch getOwnedBatchOrThrow(Long batchId, Long loggedInUserId) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));

        if (!batch.getFarmer().getId().equals(farmer.getId())) {
            throw new AccessDeniedException("This batch does not belong to the logged-in farmer");
        }
        return batch;
    }

    private ExpenseResponse toResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .batchId(expense.getBatch().getId())
                .expenseDate(expense.getExpenseDate())
                .category(expense.getCategory())
                .amount(expense.getAmount())
                .description(expense.getDescription())
                .build();
    }
}
