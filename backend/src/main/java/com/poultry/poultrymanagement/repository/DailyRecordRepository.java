package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.DailyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyRecordRepository extends JpaRepository<DailyRecord, Long> {

    List<DailyRecord> findByBatchIdOrderByRecordDateAsc(Long batchId);

    Optional<DailyRecord> findByBatchIdAndRecordDate(Long batchId, LocalDate recordDate);

    // Most recent entry for a batch -- useful for computing the next day's
    // cumulative mortality / remaining birds without re-summing history.
    Optional<DailyRecord> findTopByBatchIdOrderByRecordDateDesc(Long batchId);
}
