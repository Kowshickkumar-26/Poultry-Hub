package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.Expense;
import com.poultry.poultrymanagement.entity.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByBatchIdOrderByExpenseDateAsc(Long batchId);

    // Used for the profitability breakdown-by-category report.
    List<Expense> findByBatchIdAndCategory(Long batchId, ExpenseCategory category);
}
