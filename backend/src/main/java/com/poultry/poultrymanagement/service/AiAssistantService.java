package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.AiQueryResponse;
import com.poultry.poultrymanagement.service.ai.VeterinaryAiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private final VeterinaryAiChatService veterinaryAiChatService;

    @Transactional
    public AiQueryResponse processQuery(String rawPrompt, Long loggedInUserId) {
        return veterinaryAiChatService.processQuery(rawPrompt, loggedInUserId);
    }
}
