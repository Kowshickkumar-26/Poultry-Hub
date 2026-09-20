package com.poultry.poultrymanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiQueryResponse {
    private String answer;
    private String category;
    private List<String> keyInsights;
    private Map<String, Object> dataPoints;
    private List<String> suggestions;

    // Enhanced Clinical & RAG Fields
    private List<String> possibleCauses;
    private List<String> recommendedActions;
    private List<String> warningSigns;
    private Boolean requiresVeterinarian;
    private List<String> sources;
    private String confidence;
    private Long conversationId;
}
