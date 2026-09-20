package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.Farm;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FarmRepository extends JpaRepository<Farm, Long> {
}
