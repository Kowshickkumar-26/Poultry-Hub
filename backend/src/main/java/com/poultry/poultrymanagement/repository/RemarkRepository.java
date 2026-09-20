package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.Remark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RemarkRepository extends JpaRepository<Remark, Long> {

    List<Remark> findByBatchIdOrderByRemarkDateDesc(Long batchId);

    List<Remark> findByBatchIdOrderByRemarkDateAsc(Long batchId);
}
