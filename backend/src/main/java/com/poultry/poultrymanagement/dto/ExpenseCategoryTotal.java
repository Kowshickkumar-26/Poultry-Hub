package com.poultry.poultrymanagement.dto;

import com.poultry.poultrymanagement.entity.ExpenseCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseCategoryTotal {
    private ExpenseCategory category;
    private BigDecimal total;
}
