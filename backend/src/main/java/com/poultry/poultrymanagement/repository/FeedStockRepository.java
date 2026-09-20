package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.FeedStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FeedStockRepository extends JpaRepository<FeedStock, Long> {

    // One row per batch -- this is the lookup you'll call constantly
    Optional<FeedStock> findByBatchId(Long batchId);
}
