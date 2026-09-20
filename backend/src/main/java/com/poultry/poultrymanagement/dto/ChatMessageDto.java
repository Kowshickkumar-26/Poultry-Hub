package com.poultry.poultrymanagement.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private Long id;
    private Long conversationId;
    private String sender; // "USER" or "AI"
    private String text;
    private String category;
    private String confidence;
    private boolean requiresVeterinarian;
    private List<String> keyInsights;
    private List<String> warningSigns;
    private List<String> sources;
    private LocalDateTime createdAt;
}
