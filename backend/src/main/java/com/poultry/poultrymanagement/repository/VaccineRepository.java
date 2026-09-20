package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.Vaccine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VaccineRepository extends JpaRepository<Vaccine, Long> {

    List<Vaccine> findByBatchIdOrderByGivenDateAsc(Long batchId);
}
