package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.FeedLoad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedLoadRepository extends JpaRepository<FeedLoad, Long> {

    List<FeedLoad> findByBatchIdOrderByLoadDateAsc(Long batchId);
}
