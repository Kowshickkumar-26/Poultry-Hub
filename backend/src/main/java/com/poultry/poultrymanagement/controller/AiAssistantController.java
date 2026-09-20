package com.poultry.poultrymanagement.controller;

import com.poultry.poultrymanagement.dto.AiChatRequest;
import com.poultry.poultrymanagement.dto.AiQueryRequest;
import com.poultry.poultrymanagement.dto.AiQueryResponse;
import com.poultry.poultrymanagement.dto.ConversationResponse;
import com.poultry.poultrymanagement.security.UserPrincipal;
import com.poultry.poultrymanagement.service.ai.VeterinaryAiChatService;
import com.poultry.poultrymanagement.service.ai.VeterinaryKnowledgeIngestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiAssistantController {

    private final VeterinaryAiChatService veterinaryAiChatService;
    private final VeterinaryKnowledgeIngestionService knowledgeIngestionService;

    // 100% Backward Compatible Endpoint for existing frontend
    @PostMapping("/query")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public AiQueryResponse queryAi(
            @Valid @RequestBody AiQueryRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return veterinaryAiChatService.processQuery(request.getPrompt(), principal.getId());
    }

    // New Conversation-Aware Multi-Turn Endpoint
    @PostMapping("/chat")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public AiQueryResponse chatWithAi(
            @Valid @RequestBody AiChatRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return veterinaryAiChatService.processChat(
                request.getConversationId(),
                request.getBatchId(),
                request.getPrompt(),
                principal.getId()
        );
    }

    // Get User's Saved Chat Conversations
    @GetMapping("/conversations")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public List<ConversationResponse> getConversations(@AuthenticationPrincipal UserPrincipal principal) {
        return veterinaryAiChatService.getUserConversations(principal.getId());
    }

    // Get Full Message History for a Specific Conversation
    @GetMapping("/history/{conversationId}")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public ConversationResponse getConversationHistory(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return veterinaryAiChatService.getConversationHistory(conversationId, principal.getId());
    }

    // Clear / Delete Conversation
    @DeleteMapping("/history/{conversationId}")
    @PreAuthorize("hasAnyRole('FARMER', 'CEO')")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable Long conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        veterinaryAiChatService.deleteConversation(conversationId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    // CEO / Admin Trigger to Re-ingest Veterinary Knowledge Base
    @PostMapping("/knowledge/ingest")
    @PreAuthorize("hasRole('CEO')")
    public ResponseEntity<Map<String, Object>> reingestKnowledgeBase() {
        try {
            knowledgeIngestionService.ingestClasspathKnowledge();
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Veterinary knowledge documents successfully re-indexed into Vector Store."
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error",
                    "message", "Knowledge ingestion failed: " + e.getMessage()
            ));
        }
    }
}
