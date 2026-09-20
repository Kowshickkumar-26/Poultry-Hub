package com.poultry.poultrymanagement.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatRequest {

    private Long conversationId;
    private Long batchId;

    @NotBlank(message = "Prompt cannot be blank")
    private String prompt;
}
