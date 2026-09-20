package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.RemarkRequest;
import com.poultry.poultrymanagement.dto.RemarkResponse;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.Remark;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.entity.User;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.RemarkRepository;
import com.poultry.poultrymanagement.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RemarkService {

    private final RemarkRepository remarkRepository;
    private final BatchRepository batchRepository;
    private final FarmerRepository farmerRepository;
    private final UserRepository userRepository;
    private final BatchService batchService;

    @Transactional
    public RemarkResponse addRemark(Long batchId, RemarkRequest request, Long loggedInUserId) {
        User user = userRepository.findById(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + loggedInUserId));

        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));

        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot add remarks. This batch is already completed.");
        }

        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Remarks can only be added to an ACTIVE batch");
        }

        verifyCanWriteRemark(batch, user);

        Remark remark = Remark.builder()
                .batch(batch)
                .remarkDate(request.getRemarkDate())
                .note(request.getNote())
                .createdBy(user)
                .build();

        return toResponse(remarkRepository.save(remark));
    }

    @Transactional(readOnly = true)
    public List<RemarkResponse> getRemarks(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);
        return remarkRepository.findByBatchIdOrderByRemarkDateDesc(batchId).stream()
                .map(this::toResponse)
                .toList();
    }

    private void verifyCanWriteRemark(Batch batch, User user) {
        if (user.getRole() == Role.FARMER) {
            boolean ownsBatch = farmerRepository.findByUserId(user.getId())
                    .map(farmer -> batch.getFarmer().getId().equals(farmer.getId()))
                    .orElse(false);
            if (!ownsBatch) {
                throw new AccessDeniedException("This batch does not belong to the logged-in farmer");
            }
        } else {
            throw new AccessDeniedException("Only farmers can add remarks");
        }
    }

    private RemarkResponse toResponse(Remark remark) {
        return RemarkResponse.builder()
                .id(remark.getId())
                .batchId(remark.getBatch().getId())
                .remarkDate(remark.getRemarkDate())
                .note(remark.getNote())
                .createdByUserId(remark.getCreatedBy().getId())
                .createdByName(remark.getCreatedBy().getName())
                .createdByRole(remark.getCreatedBy().getRole().name())
                .build();
    }
}
