package com.poultry.poultrymanagement.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.poultry.poultrymanagement.dto.AiQueryResponse;
import com.poultry.poultrymanagement.dto.ChatMessageDto;
import com.poultry.poultrymanagement.dto.ConversationResponse;
import com.poultry.poultrymanagement.entity.*;
import com.poultry.poultrymanagement.repository.*;
import com.poultry.poultrymanagement.service.ai.VeterinaryKnowledgeIngestionService.KnowledgeMatch;
import com.poultry.poultrymanagement.service.ai.VeterinarySafetyGuardrail.SafetyCheckResult;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.output.Response;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VeterinaryAiChatService {

    private final ChatLanguageModel chatLanguageModel;
    private final VeterinaryKnowledgeIngestionService knowledgeService;
    private final FlockDataTools flockDataTools;
    private final VeterinarySafetyGuardrail safetyGuardrail;
    private final UserRepository userRepository;
    private final FarmerRepository farmerRepository;
    private final BatchRepository batchRepository;
    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
            You are 'PoultryAI', an expert Senior Avian Veterinarian, Poultry Science Specialist, and Farm Operations Advisor.
            Your role is to assist broiler farmers and farm executives with flock health, growth trajectories, mortality diagnosis, biosecurity, and feed conversion optimization.
            
            GUIDELINES & CLINICAL REASONING RULES:
            1. Always ground your analysis in the provided LIVE FLOCK TELEMETRY and RETRIEVED VETERINARY COMPENDIUM EVIDENCE.
            2. For health issues, present differential diagnoses (possible diseases/causes) based on observed symptoms and flock age.
            3. Clearly distinguish between:
               - 📊 **Flock Status & Observed Facts**
               - 🔍 **Potential Causes / Differential Diagnoses**
               - 💡 **Actionable Farm Management & Biosecurity Steps**
               - ⚠️ **Veterinary Warnings & When to Escalate**
            4. **Medication & Pharmacological Safety:**
               - Never blindly prescribe prescription antibiotics without recommending veterinary diagnostic confirmation.
               - Always emphasize active ingredient dosage calculation by live flock weight (not bird age alone).
               - Always emphasize mandatory slaughter withdrawal periods.
            5. If clinical signs indicate severe emergencies (e.g. Newcastle, Gumboro, Avian Influenza, acute mortality spike, torticollis, bloody stool), urge IMMEDIATE consultation with a licensed veterinarian.
            6. Format your responses with clean Markdown headers, bold highlights, and clear bullet points.
            """;

    @Transactional
    public AiQueryResponse processQuery(String rawPrompt, Long loggedInUserId) {
        return processChatInternal(null, null, rawPrompt, loggedInUserId);
    }

    @Transactional
    public AiQueryResponse processChat(Long conversationId, Long batchId, String rawPrompt, Long loggedInUserId) {
        return processChatInternal(conversationId, batchId, rawPrompt, loggedInUserId);
    }

    private AiQueryResponse processChatInternal(Long conversationId, Long explicitBatchId, String rawPrompt, Long loggedInUserId) {
        User user = userRepository.findById(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + loggedInUserId));

        String prompt = rawPrompt != null ? rawPrompt.trim() : "";
        if (prompt.isEmpty()) {
            return AiQueryResponse.builder()
                    .answer("Please enter a question or observation regarding your flock.")
                    .category("General Assistance")
                    .build();
        }

        // 1. Safety & Prompt Injection Pre-Filter
        SafetyCheckResult safetyResult = safetyGuardrail.evaluatePrePrompt(prompt);
        if (safetyResult.isSecurityViolation()) {
            return AiQueryResponse.builder()
                    .answer(safetyResult.getSecurityViolationMessage())
                    .category("Security Guardrail")
                    .confidence("High")
                    .requiresVeterinarian(false)
                    .build();
        }

        // 2. Identify Active Flock & Context
        Batch activeBatch = null;
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId).orElse(null);

        if (explicitBatchId != null) {
            activeBatch = batchRepository.findById(explicitBatchId).orElse(null);
        } else if (farmer != null) {
            activeBatch = batchRepository.findByFarmerIdOrderByStartDateDesc(farmer.getId()).stream()
                    .filter(b -> b.getStatus() == BatchStatus.ACTIVE)
                    .findFirst()
                    .orElse(null);
        }

        // 3. Retrieve Live Flock Telemetry via Function Calling Tools
        Map<String, Object> flockTelemetry = new LinkedHashMap<>();
        if (activeBatch != null) {
            flockTelemetry.put("flockOverview", flockDataTools.getFlockOverview(activeBatch.getId()));
            flockTelemetry.put("mortalityTrend", flockDataTools.getMortalityTrend(activeBatch.getId(), 7));
            flockTelemetry.put("growthAndFcr", flockDataTools.getGrowthAndFcrMetrics(activeBatch.getId()));
            flockTelemetry.put("feedStock", flockDataTools.getFeedStockAndConsumption(activeBatch.getId()));
            flockTelemetry.put("vaccinations", flockDataTools.getVaccinationHistory(activeBatch.getId()));
            flockTelemetry.put("recentRemarks", flockDataTools.getRecentObservationsAndRemarks(activeBatch.getId()));
            flockTelemetry.put("financials", flockDataTools.getFinancialSummary(activeBatch.getId()));
        } else if (user.getRole() == Role.CEO) {
            flockTelemetry.put("ceoContext", "Executive user inspecting entire farm network.");
        }

        // 4. Retrieve Grounded Veterinary Knowledge via Vector Search (RAG)
        List<KnowledgeMatch> matches = knowledgeService.searchKnowledge(prompt, 3, 0.50);
        List<String> sourceCitations = matches.stream()
                .map(m -> String.format("%s (%s)", m.getSource(), m.getTopic()))
                .distinct()
                .collect(Collectors.toList());

        // 5. Manage / Create Conversation Session
        ChatConversation conversation = getOrCreateConversation(conversationId, user, activeBatch, prompt);

        // 6. Build Contextual Prompt for LLM
        List<ChatMessage> conversationMessages = new ArrayList<>();
        conversationMessages.add(new SystemMessage(SYSTEM_PROMPT));

        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("=== LIVE FLOCK TELEMETRY ===\n");
        try {
            contextBuilder.append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(flockTelemetry));
        } catch (Exception e) {
            contextBuilder.append(flockTelemetry.toString());
        }

        contextBuilder.append("\n\n=== RETRIEVED VETERINARY KNOWLEDGE (RAG) ===\n");
        if (!matches.isEmpty()) {
            for (KnowledgeMatch km : matches) {
                contextBuilder.append(String.format("--- Topic: %s (Source: %s) ---\n%s\n\n", km.getTopic(), km.getSource(), km.getText()));
            }
        } else {
            contextBuilder.append("No specific high-similarity veterinary document matched. Rely on verified core avian veterinary principles.\n");
        }

        conversationMessages.add(new SystemMessage(contextBuilder.toString()));

        // Add previous multi-turn conversation messages (last 6 messages for context)
        List<ChatMessageEntity> pastMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        int startIdx = Math.max(0, pastMessages.size() - 6);
        for (int i = startIdx; i < pastMessages.size(); i++) {
            ChatMessageEntity pme = pastMessages.get(i);
            if ("USER".equalsIgnoreCase(pme.getSender())) {
                conversationMessages.add(new UserMessage(pme.getText()));
            } else {
                conversationMessages.add(new AiMessage(pme.getText()));
            }
        }

        conversationMessages.add(new UserMessage(prompt));

        // 7. Execute LLM with Fallback Guard
        String llmResponseText;
        String confidence = "High";
        try {
            log.info("Invoking LLM for prompt: '{}'", prompt);
            Response<AiMessage> response = chatLanguageModel.generate(conversationMessages);
            llmResponseText = response.content().text();
        } catch (Exception e) {
            log.warn("Remote LLM execution failed or not configured ({}). Using Local Veterinary Reasoning Engine.", e.getMessage());
            llmResponseText = generateLocalVeterinaryResponse(prompt, activeBatch, flockTelemetry, matches, safetyResult);
            confidence = "Medium";
        }

        // 8. Post-Response Safety Sanitization
        boolean isEmergency = safetyResult.isEmergency() || llmResponseText.toLowerCase().contains("urgent") || llmResponseText.toLowerCase().contains("emergency");
        String finalAnswer = safetyGuardrail.sanitizeAndEnforcePostResponse(llmResponseText, isEmergency);

        // 9. Extract Insights, Causes, and Warnings
        List<String> possibleCauses = extractPossibleCauses(finalAnswer, matches);
        List<String> keyInsights = extractKeyInsights(flockTelemetry, matches, activeBatch);
        List<String> warningSigns = safetyResult.getEmergencyWarnings();
        boolean requiresVet = isEmergency || finalAnswer.toLowerCase().contains("veterinarian");

        List<String> suggestions = generateFollowUpSuggestions(prompt, activeBatch);

        // 10. Persist User and AI Messages into Database
        saveMessage(conversation, "USER", prompt, null, null, false, null, null, null);
        saveMessage(conversation, "AI", finalAnswer, categorizeResponse(prompt), confidence, requiresVet, keyInsights, warningSigns, sourceCitations);

        return AiQueryResponse.builder()
                .answer(finalAnswer)
                .category(categorizeResponse(prompt))
                .confidence(confidence)
                .requiresVeterinarian(requiresVet)
                .possibleCauses(possibleCauses)
                .recommendedActions(List.of(
                        "Monitor flock water intake and environmental shed ventilation",
                        "Verify feed freshness and inspect litter dryness around drinker lines",
                        "Log daily morning and afternoon mortality accurately"
                ))
                .warningSigns(warningSigns)
                .keyInsights(keyInsights)
                .sources(sourceCitations)
                .suggestions(suggestions)
                .conversationId(conversation.getId())
                .dataPoints(flockTelemetry)
                .build();
    }

    private String generateLocalVeterinaryResponse(
            String prompt,
            Batch activeBatch,
            Map<String, Object> telemetry,
            List<KnowledgeMatch> matches,
            SafetyCheckResult safetyResult
    ) {
        StringBuilder sb = new StringBuilder();
        String lower = prompt.toLowerCase();

        if (safetyResult.isEmergency()) {
            sb.append("### 🚨 Critical Clinical Warning & Urgent Action\n\n");
            sb.append("**Emergency Symptoms Detected in Flock Inquiry:**\n");
            for (String w : safetyResult.getEmergencyWarnings()) {
                sb.append("- ").append(w).append("\n");
            }
            sb.append("\n**Immediate Action Protocol:**\n");
            sb.append("1. **Contact Licensed Veterinarian:** Call your technical field officer immediately for post-mortem necropsy.\n");
            sb.append("2. **Isolate Shed:** Disinfect footwear, lock down shed access, and prevent cross-contamination.\n");
            sb.append("3. **Check Ventilation:** Ensure fans are running at optimal speed and air inlets are unobstructed.\n\n");
        } else {
            sb.append("### 🐔 Poultry Health & Management Analysis\n\n");
        }

        if (activeBatch != null) {
            sb.append(String.format("#### 📊 RECORDED FLOCK STATUS (Batch `%s`)\n", activeBatch.getBatchCode()));
            @SuppressWarnings("unchecked")
            Map<String, Object> overview = (Map<String, Object>) telemetry.get("flockOverview");
            if (overview != null) {
                sb.append(String.format("- **Flock Age:** Day **%s**\n", overview.get("ageInDays")));
                sb.append(String.format("- **Live Birds:** **%,d** (Initial: %,d)\n",
                        ((Number) overview.get("remainingLiveBirds")).intValue(),
                        ((Number) overview.get("initialBirds")).intValue()));
                sb.append(String.format("- **Cumulative Mortality:** **%s** (%.2f%%)\n", overview.get("cumulativeMortality"), overview.get("mortalityPercentage")));
                sb.append(String.format("- **Latest Avg Weight:** **%s** g | **Cumulative FCR:** **%s**\n", overview.get("latestAverageWeightG"), overview.get("cumulativeFCR")));
                sb.append(String.format("- **Available Feed Stock:** **%s kg** (%s bags)\n\n", overview.get("currentFeedStockKg"), overview.get("currentFeedStockBags")));
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> fin = (Map<String, Object>) telemetry.get("financials");
            if (fin != null && fin.get("totalBirdsSold") != null && ((Number) fin.get("totalBirdsSold")).intValue() > 0) {
                sb.append(String.format("- **Total Birds Sold:** **%s** birds (Total Sales Revenue: $%s)\n\n",
                        fin.get("totalBirdsSold"), fin.get("totalSalesRevenue")));
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> remObj = (Map<String, Object>) telemetry.get("recentRemarks");
            if (remObj != null && remObj.get("remarks") != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> remList = (List<Map<String, Object>>) remObj.get("remarks");
                if (!remList.isEmpty()) {
                    sb.append("#### 📝 RECENT FLOCK OBSERVATIONS & REMARKS\n");
                    for (Map<String, Object> r : remList) {
                        sb.append(String.format("- **%s:** %s\n", r.get("date"), r.get("note")));
                    }
                    sb.append("\n");
                }
            }
        }

        if (lower.contains("medicine") || lower.contains("dose") || lower.contains("dosage") || lower.contains("tornic") || lower.contains("antibiotic")) {
            sb.append("#### ⚠️ Medication & Dosage Safety Advisory\n");
            sb.append("The AI Assistant **strictly does NOT calculate, prescribe, or invent drug dosages** or water dilution concentrations without diagnostic verification.\n\n");
            sb.append("#### 📋 Recommended Safe Protocol:\n");
            sb.append("1. **Inspect Product Packaging:** Always check the manufacturer label on the bottle/sachet for the exact active ingredient concentration.\n");
            sb.append("2. **Calculate Water Intake:** Estimate water consumption in a 4 to 6 hour morning window for fresh uptake.\n");
            sb.append("3. **Consult a Veterinarian:** Always Consult a Veterinarian or technical field officer before administering prescription therapeutics.\n");
            sb.append("4. **Withdrawal Period:** Observe mandatory slaughter withdrawal periods.\n\n");
        }

        if (lower.contains("heat") || lower.contains("temperature") || lower.contains("hot") || lower.contains("summer") || lower.contains("panting")) {
            sb.append("#### 🌡️ Heat Stress Management Actions\n");
            sb.append("1. **Airflow Velocity:** Ensure tunnel fans provide minimum airspeed of 2.5 to 3.0 m/s over birds.\n");
            sb.append("2. **Water Line Flushing:** Flush drinking lines regularly to keep water cool (< 24°C / 75°F).\n");
            sb.append("3. **Feeding Schedule:** Shift feeding times to early morning and late night to avoid digestion metabolic heat.\n");
            sb.append("4. **Electrolytes & Vitamin C:** Supplement drinking water with electrolytes and Vitamin C.\n\n");
        }

        if (lower.contains("weight") || lower.contains("weigh") || lower.contains("growth") || lower.contains("gain")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> growth = (Map<String, Object>) telemetry.get("growthAndFcr");
            if (growth != null && growth.get("latestWeightG") != null) {
                sb.append(String.format("#### ⚖️ Weight & Growth Trajectory\n"));
                sb.append(String.format("- Latest Sample Weight: **%s g** (Previous: %s g)\n", growth.get("latestWeightG"), growth.get("previousWeightG")));
                sb.append(String.format("- Weight Gain: **+%s g** (~%s g/day)\n\n", growth.get("weightGainG"), growth.get("approxDailyGainGrams")));
            }
        }

        if (lower.contains("feed") || lower.contains("stock") || lower.contains("inventory") || lower.contains("bag")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> feed = (Map<String, Object>) telemetry.get("feedStock");
            if (feed != null && feed.get("totalLoadedKg") != null) {
                sb.append("#### 🌾 Feed Stock & Inventory Metrics\n");
                sb.append(String.format("- Total Feed Loaded: **%s kg**\n", feed.get("totalLoadedKg")));
                sb.append(String.format("- Total Feed Consumed: **%s kg**\n", feed.get("totalConsumedKg")));
                sb.append(String.format("- Current Feed Balance: **%s kg** (%s bags)\n\n", feed.get("currentStockKg"), feed.get("currentStockBags")));
            }
        }

        if (lower.contains("cough") || lower.contains("snick") || lower.contains("gasp")) {
            sb.append("#### ⚠️ RESPIRATORY SYMPTOM EVALUATION\n");
            sb.append("- **Observed Symptoms:** Coughing, snicking, or respiratory rales detected in flock.\n");
            sb.append("- **Possible Etiologies:** Infectious Bronchitis (IB), Chronic Respiratory Disease (CRD / Mycoplasma), Infectious Coryza, or High Shed Ammonia (> 20 ppm).\n");
            sb.append("- **Airflow Action:** Verify tunnel fan static pressure and flush drinker lines.\n\n");
        }

        if (lower.contains("compare") || lower.contains("lowest mortality") || lower.contains("highest mortality") || lower.contains("best fcr")) {
            sb.append("#### 📈 Comparative Performance & Historical Benchmarking\n");
            sb.append("- Comparative analysis indicates performance is benchmarked against standard Cobb 500 and Ross 308 operational objectives (1,000 to 3,000 birds reference cycle).\n");
            sb.append("- Target Cumulative Mortality: < 3.5% across full 35–42 day cycle.\n");
            sb.append("- Target Harvest FCR: 1.45 to 1.65.\n\n");
        }

        if (!matches.isEmpty()) {
            sb.append("#### 🔍 POSSIBLE CAUSES & VETERINARY COMPENDIUM EVIDENCE\n");
            for (KnowledgeMatch km : matches) {
                sb.append(String.format("**%s** *(Source: %s)*\n", km.getTopic(), km.getSource()));
                sb.append(km.getText()).append("\n\n");
            }
        } else {
            sb.append("#### 🔍 POSSIBLE CAUSES & GENERAL MANAGEMENT RECOMMENDATIONS\n");
            sb.append("- **Air Quality & Ventilation:** Ensure ammonia levels remain below 15 ppm to protect respiratory cilia.\n");
            sb.append("- **Water Sanitation:** Maintain 3–5 ppm chlorine sanitizer at drinker nipples.\n");
            sb.append("- **Litter Maintenance:** Keep bedding dry (target 20–25% moisture) to prevent coccidial oocyst sporulation.\n\n");
        }

        sb.append("#### 💡 RECOMMENDED NEXT STEPS\n");
        sb.append("1. Continue logging accurate daily records for morning and evening mortality.\n");
        sb.append("2. Perform daily physical walk-throughs inspecting bird distribution, droppings, and feeding behavior.\n");
        sb.append("3. If mortality increases or respiratory sounds worsen, contact a qualified poultry veterinarian.");

        return sb.toString();
    }

    private ChatConversation getOrCreateConversation(Long conversationId, User user, Batch activeBatch, String prompt) {
        if (conversationId != null) {
            Optional<ChatConversation> convOpt = conversationRepository.findByIdAndUserId(conversationId, user.getId());
            if (convOpt.isPresent()) {
                return convOpt.get();
            }
        }

        String title = prompt.length() > 40 ? prompt.substring(0, 37) + "..." : prompt;
        ChatConversation newConv = ChatConversation.builder()
                .user(user)
                .batch(activeBatch)
                .title(title)
                .build();

        return conversationRepository.save(newConv);
    }

    private void saveMessage(
            ChatConversation conversation,
            String sender,
            String text,
            String category,
            String confidence,
            boolean requiresVet,
            List<String> keyInsights,
            List<String> warningSigns,
            List<String> sources
    ) {
        try {
            ChatMessageEntity msg = ChatMessageEntity.builder()
                    .conversation(conversation)
                    .sender(sender)
                    .text(text)
                    .category(category)
                    .confidence(confidence)
                    .requiresVeterinarian(requiresVet)
                    .keyInsightsJson(keyInsights != null ? objectMapper.writeValueAsString(keyInsights) : null)
                    .warningSignsJson(warningSigns != null ? objectMapper.writeValueAsString(warningSigns) : null)
                    .sourcesJson(sources != null ? objectMapper.writeValueAsString(sources) : null)
                    .build();

            messageRepository.save(msg);
        } catch (Exception e) {
            log.error("Failed to persist chat message: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> getUserConversations(Long loggedInUserId) {
        List<ChatConversation> conversations = conversationRepository.findByUserIdOrderByUpdatedAtDesc(loggedInUserId);
        return conversations.stream().map(c -> {
            List<ChatMessageEntity> msgs = messageRepository.findByConversationIdOrderByCreatedAtAsc(c.getId());
            List<ChatMessageDto> dtos = msgs.stream().map(this::toDto).collect(Collectors.toList());

            return ConversationResponse.builder()
                    .id(c.getId())
                    .userId(c.getUser().getId())
                    .batchId(c.getBatch() != null ? c.getBatch().getId() : null)
                    .batchCode(c.getBatch() != null ? c.getBatch().getBatchCode() : null)
                    .title(c.getTitle())
                    .createdAt(c.getCreatedAt())
                    .updatedAt(c.getUpdatedAt())
                    .messages(dtos)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConversationResponse getConversationHistory(Long conversationId, Long loggedInUserId) {
        ChatConversation conversation = conversationRepository.findByIdAndUserId(conversationId, loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("Conversation not found: " + conversationId));

        List<ChatMessageEntity> msgs = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<ChatMessageDto> dtos = msgs.stream().map(this::toDto).collect(Collectors.toList());

        return ConversationResponse.builder()
                .id(conversation.getId())
                .userId(conversation.getUser().getId())
                .batchId(conversation.getBatch() != null ? conversation.getBatch().getId() : null)
                .batchCode(conversation.getBatch() != null ? conversation.getBatch().getBatchCode() : null)
                .title(conversation.getTitle())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .messages(dtos)
                .build();
    }

    @Transactional
    public void deleteConversation(Long conversationId, Long loggedInUserId) {
        ChatConversation conversation = conversationRepository.findByIdAndUserId(conversationId, loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("Conversation not found: " + conversationId));
        conversationRepository.delete(conversation);
    }

    private ChatMessageDto toDto(ChatMessageEntity entity) {
        List<String> keyInsights = parseJsonList(entity.getKeyInsightsJson());
        List<String> warningSigns = parseJsonList(entity.getWarningSignsJson());
        List<String> sources = parseJsonList(entity.getSourcesJson());

        return ChatMessageDto.builder()
                .id(entity.getId())
                .conversationId(entity.getConversation().getId())
                .sender(entity.getSender())
                .text(entity.getText())
                .category(entity.getCategory())
                .confidence(entity.getConfidence())
                .requiresVeterinarian(entity.isRequiresVeterinarian())
                .keyInsights(keyInsights)
                .warningSigns(warningSigns)
                .sources(sources)
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String categorizeResponse(String prompt) {
        String p = prompt.toLowerCase();
        if (p.contains("medicine") || p.contains("dose") || p.contains("dosage") || p.contains("antibiotic") || p.contains("tornic")) return "Medication Safety";
        if (p.contains("heat") || p.contains("temperature") || p.contains("summer") || p.contains("panting")) return "Heat Stress Management";
        if (p.contains("weight") || p.contains("gain") || p.contains("weigh")) return "Weight & Growth";
        if (p.contains("fcr") || p.contains("conversion")) return "FCR & Efficiency";
        if (p.contains("feed") || p.contains("bag") || p.contains("consumed") || p.contains("stock") || p.contains("inventory")) return "Feed & Inventory";
        if (p.contains("compare") || p.contains("previous batch") || p.contains("history")) return "Comparative Performance";
        if (p.contains("mortality") || p.contains("dead") || p.contains("death") || p.contains("die")) return "Mortality Analysis";
        if (p.contains("cough") || p.contains("snick") || p.contains("gasp") || p.contains("rattle") || p.contains("symptom") || p.contains("warning") || p.contains("sick") || p.contains("disease") || p.contains("health")) return "Health & Warning Signs";
        if (p.contains("vaccin") || p.contains("gumboro") || p.contains("lasota")) return "Flock Health & Vaccination";
        if (p.contains("current batch") || p.contains("active batch") || p.contains("my batch") || p.contains("analyze my batch")) return "Current Batch Analysis";
        return "Clinical Veterinary Consultation";
    }

    private List<String> extractPossibleCauses(String answer, List<KnowledgeMatch> matches) {
        Set<String> causes = new LinkedHashSet<>();
        String lower = answer.toLowerCase();

        if (lower.contains("newcastle")) causes.add("Newcastle Disease (ND)");
        if (lower.contains("infectious bronchitis")) causes.add("Infectious Bronchitis (IB)");
        if (lower.contains("crd") || lower.contains("mycoplasma")) causes.add("Chronic Respiratory Disease (CRD)");
        if (lower.contains("coccidiosis")) causes.add("Coccidiosis (Eimeria spp.)");
        if (lower.contains("necrotic enteritis")) causes.add("Necrotic Enteritis (Clostridium perfringens)");
        if (lower.contains("colibacillosis") || lower.contains("e. coli")) causes.add("Colibacillosis (E. coli)");
        if (lower.contains("gumboro") || lower.contains("ibd")) causes.add("Infectious Bursal Disease (Gumboro)");
        if (lower.contains("heat stress")) causes.add("Acute Heat Stress");
        if (lower.contains("ammonia")) causes.add("Elevated Ammonia / Inadequate Airflow");

        for (KnowledgeMatch km : matches) {
            causes.add(km.getTopic());
        }

        return new ArrayList<>(causes);
    }

    private List<String> extractKeyInsights(Map<String, Object> telemetry, List<KnowledgeMatch> matches, Batch activeBatch) {
        List<String> insights = new ArrayList<>();
        if (activeBatch != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> overview = (Map<String, Object>) telemetry.get("flockOverview");
            if (overview != null) {
                insights.add(String.format("Batch %s is at Day %s with %s live birds",
                        activeBatch.getBatchCode(), overview.get("ageInDays"), overview.get("remainingLiveBirds")));
            }
        }
        if (!matches.isEmpty()) {
            insights.add("Grounded in verified Avian Veterinary & Cobb-Ross management standards");
        }
        return insights;
    }

    private List<String> generateFollowUpSuggestions(String prompt, Batch activeBatch) {
        List<String> suggestions = new ArrayList<>();
        String p = prompt.toLowerCase();

        if (p.contains("cough") || p.contains("respiratory")) {
            suggestions.add("Are there any warning signs in my flock?");
            suggestions.add("Check today's mortality");
            suggestions.add("How to manage ventilation during respiratory illness?");
        } else if (p.contains("heat") || p.contains("hot")) {
            suggestions.add("How to supplement electrolytes during heat stress?");
            suggestions.add("Check my feed stock");
            suggestions.add("Analyze my bird weight");
        } else if (p.contains("weight") || p.contains("fcr")) {
            suggestions.add("Analyze my FCR");
            suggestions.add("Compare with previous batch");
            suggestions.add("Check my feed stock");
        } else {
            suggestions.add("Analyze my current batch");
            suggestions.add("Check today's mortality");
            suggestions.add("Are there any warning signs?");
            suggestions.add("Check my feed stock");
        }

        return suggestions;
    }
}
