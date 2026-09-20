package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    Optional<Batch> findByBatchCode(String batchCode);

    List<Batch> findByFarmId(Long farmId);

    List<Batch> findByFarmerId(Long farmerId);

    // Used for the farmer's "active batch" dashboard view.
    List<Batch> findByFarmerIdAndStatus(Long farmerId, BatchStatus status);

    // Used for the farmer's "historical batches" comparison view.
    List<Batch> findByFarmerIdOrderByStartDateDesc(Long farmerId);

    // Used for CEO to view batches by status (ACTIVE or COMPLETED)
    List<Batch> findByStatus(BatchStatus status);
}
