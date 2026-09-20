package com.poultry.poultrymanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private String id;
    private String type;
    private String title;
    private String message;
    private String category;
    private String severity;
    private String link;
    private Long batchId;
    private String batchCode;
    private boolean read;
    private LocalDateTime createdAt;
}
