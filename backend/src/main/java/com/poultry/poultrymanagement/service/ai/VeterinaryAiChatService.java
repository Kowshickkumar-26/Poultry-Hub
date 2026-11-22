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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
    private final DailyRecordRepository dailyRecordRepository;
    private final SaleRepository saleRepository;
    private final RemarkRepository remarkRepository;
    private final VaccineRepository vaccineRepository;
    private final FeedStockRepository feedStockRepository;
    private final FeedLoadRepository feedLoadRepository;
    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
            You are PoultryAI, the intelligent Farm Operations and Veterinary Intelligence Assistant for PoultryHub.
            
            CORE PRINCIPLES & STRICT INTENT RELEVANCE:
            1. Real-Time MySQL Database is your ABSOLUTE source of truth for all farm telemetry, day records, feed delivery loads, mortality, weights, feed intake, feed stock, bird counts, sales, and vaccines.
            2. Answer PRECISELY and EXCLUSIVELY what the user asks. Do NOT provide broad or unsolicited inventory summaries, bird counts, or extraneous metrics when the user asks a specific question.
            3. When asked "When was the last feed stock loaded?", "When was feed delivered?", or similar feed loading questions:
               - State PRECISELY the latest feed delivery record from the MySQL database logs:
                 * Delivery Date (e.g. September 27, 2026)
                 * Feed Type & Quantity (e.g. 100 Finisher bags)
                 * Total Weight (e.g. 5,000 kg @ 50 kg/bag)
               - Do NOT append unnecessary current stock balance, total consumption, mortality, or estimated days of feed remaining unless the user explicitly asks for them.
            4. When answering clinical, disease, symptom, or management questions:
               - Synthesize the retrieved Veterinary Compendium knowledge and recorded flock observations.
               - Explain potential etiologies, differential diagnoses, environmental risk factors (ventilation, temperature, ammonia, litter quality), and practical bio-security remediation steps.
            5. Pharmacology & Medication Safety:
               - Remind farmers to check manufacturer product labels, calculate dosages based on live body weight/water consumption, observe mandatory slaughter withdrawal periods, and consult a licensed veterinarian before administering prescription drugs.
            6. If specific day records or batch data are requested and do not exist in the database, clearly explain that no record has been logged for that date.
            """;

    @Transactional
    public AiQueryResponse processQuery(String rawPrompt, Long loggedInUserId) {
        return processChatInternal(null, null, rawPrompt, loggedInUserId);
    }

    @Transactional
    public AiQueryResponse processChat(Long conversationId, Long explicitBatchId, String rawPrompt, Long loggedInUserId) {
        return processChatInternal(conversationId, explicitBatchId, rawPrompt, loggedInUserId);
    }

    private AiQueryResponse processChatInternal(Long conversationId, Long explicitBatchId, String rawPrompt, Long loggedInUserId) {
        User user = userRepository.findById(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + loggedInUserId));

        String prompt = rawPrompt != null ? rawPrompt.trim() : "";
        if (prompt.isEmpty()) {
            return AiQueryResponse.builder()
                    .answer("Please enter a question regarding your farm operations, flock telemetry, or poultry health.")
                    .category("General Assistance")
                    .build();
        }

        // 1. Safety & Prompt Injection Guardrail
        SafetyCheckResult safetyResult = safetyGuardrail.evaluatePrePrompt(prompt);
        if (safetyResult.isSecurityViolation()) {
            return AiQueryResponse.builder()
                    .answer(safetyResult.getSecurityViolationMessage())
                    .category("Security Guardrail")
                    .confidence("High")
                    .requiresVeterinarian(false)
                    .build();
        }

        // 2. Identify Authenticated User's Batch Context
        Batch activeBatch = resolveActiveBatch(user, explicitBatchId);
        if (activeBatch == null && user.getRole() == Role.FARMER) {
            return AiQueryResponse.builder()
                    .answer("I couldn't find an active batch for your farm account. Please create or start a batch to query real-time flock records and telemetry.")
                    .category("Batch Notice")
                    .confidence("High")
                    .build();
        }

        // 3. Retrieve Conversation History for Multi-turn Context
        ChatConversation conversation = getOrCreateConversation(conversationId, user, activeBatch, prompt);
        List<ChatMessageEntity> pastMessages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());

        // 4. Intent & Query Context Extraction
        QueryContext queryContext = analyzeQueryContext(prompt, pastMessages, activeBatch);

        // 5. Gather Comprehensive Real-Time MySQL Database Evidence
        DatabaseEvidence dbEvidence = gatherDatabaseEvidence(activeBatch, queryContext, prompt, user);

        // 6. Check for Missing Day Record
        if (dbEvidence.isRequestedRecordMissing()) {
            String notFoundAnswer = String.format("I couldn't find a record for Day %d in the current batch (`%s`).",
                    queryContext.getDayNumber(), activeBatch != null ? activeBatch.getBatchCode() : "N/A");
            saveMessage(conversation, "USER", prompt, null, null, false, null, null, null);
            saveMessage(conversation, "AI", notFoundAnswer, "Database Query", "High", false, null, null, null);

            return AiQueryResponse.builder()
                    .answer(notFoundAnswer)
                    .category("Database Query")
                    .confidence("High")
                    .conversationId(conversation.getId())
                    .suggestions(List.of("Check today's mortality", "Analyze my current batch", "Check feed stock"))
                    .build();
        }

        // 7. Semantic Veterinary RAG Knowledge Retrieval
        List<KnowledgeMatch> matches = Collections.emptyList();
        if (queryContext.isClinicalQuery() || queryContext.isManagementQuery()) {
            matches = knowledgeService.searchKnowledge(prompt, 4, 0.35);
        }

        // 8. Construct Dynamic Grounded LLM Prompt
        List<ChatMessage> conversationMessages = new ArrayList<>();
        conversationMessages.add(new SystemMessage(SYSTEM_PROMPT));

        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("=== AUTHORITATIVE MYSQL DATABASE EVIDENCE ===\n");
        contextBuilder.append(dbEvidence.getEvidenceText()).append("\n");

        if (!matches.isEmpty()) {
            contextBuilder.append("\n=== RETRIEVED VETERINARY KNOWLEDGE COMPENDIUM ===\n");
            for (KnowledgeMatch km : matches) {
                contextBuilder.append(String.format("--- Topic: %s (Source: %s) ---\n%s\n\n", km.getTopic(), km.getSource(), km.getText()));
            }
        }

        conversationMessages.add(new SystemMessage(contextBuilder.toString()));

        // Add recent multi-turn history (last 8 messages)
        int startIdx = Math.max(0, pastMessages.size() - 8);
        for (int i = startIdx; i < pastMessages.size(); i++) {
            ChatMessageEntity pme = pastMessages.get(i);
            if ("USER".equalsIgnoreCase(pme.getSender())) {
                conversationMessages.add(new UserMessage(pme.getText()));
            } else {
                conversationMessages.add(new AiMessage(pme.getText()));
            }
        }
        conversationMessages.add(new UserMessage(prompt));

        // 9. Execute LLM with Dynamic Live-Data Fallback
        String finalAnswer;
        String confidence = "High";
        try {
            log.info("Invoking LLM for prompt: '{}' with live DB evidence", prompt);
            Response<AiMessage> response = chatLanguageModel.generate(conversationMessages);
            finalAnswer = response.content().text().trim();
        } catch (Exception e) {
            log.warn("Remote LLM execution unavailable ({}). Generating dynamic answer directly from MySQL database.", e.getMessage());
            finalAnswer = dbEvidence.getDynamicDatabaseAnswer();
            confidence = "High (MySQL Database)";
        }

        // 10. Post-processing & Safety Enforcement
        boolean isEmergency = safetyResult.isEmergency() || finalAnswer.toLowerCase().contains("emergency");
        if (queryContext.isClinicalQuery()) {
            finalAnswer = safetyGuardrail.sanitizeAndEnforcePostResponse(finalAnswer, isEmergency);
        }

        // 11. Extract Dynamic Metadata
        List<String> possibleCauses = extractDynamicCauses(finalAnswer, matches, queryContext);
        List<String> recommendedActions = extractDynamicActions(finalAnswer, queryContext);
        List<String> sourceCitations = matches.stream()
                .map(m -> String.format("%s (%s)", m.getSource(), m.getTopic()))
                .distinct()
                .collect(Collectors.toList());

        List<String> keyInsights = generateKeyInsights(activeBatch, dbEvidence);
        List<String> suggestions = generateFollowUpSuggestions(prompt, queryContext, activeBatch);

        // 12. Persist Conversation in Database
        saveMessage(conversation, "USER", prompt, null, null, false, null, null, null);
        saveMessage(conversation, "AI", finalAnswer, queryContext.getCategory(), confidence,
                queryContext.isClinicalQuery(), keyInsights, safetyResult.getEmergencyWarnings(), sourceCitations);

        return AiQueryResponse.builder()
                .answer(finalAnswer)
                .category(queryContext.getCategory())
                .confidence(confidence)
                .requiresVeterinarian(queryContext.isClinicalQuery() && (isEmergency || finalAnswer.toLowerCase().contains("veterinarian")))
                .possibleCauses(possibleCauses)
                .recommendedActions(recommendedActions)
                .keyInsights(keyInsights)
                .warningSigns(safetyResult.getEmergencyWarnings())
                .sources(sourceCitations)
                .suggestions(suggestions)
                .conversationId(conversation.getId())
                .dataPoints(dbEvidence.getDataPoints())
                .build();
    }

    private Batch resolveActiveBatch(User user, Long explicitBatchId) {
        if (explicitBatchId != null) {
            return batchRepository.findById(explicitBatchId).orElse(null);
        }

        Farmer farmer = farmerRepository.findByUserId(user.getId()).orElse(null);
        if (farmer != null) {
            return batchRepository.findByFarmerIdOrderByStartDateDesc(farmer.getId()).stream()
                    .filter(b -> b.getStatus() == BatchStatus.ACTIVE)
                    .findFirst()
                    .orElse(null);
        }

        if (user.getRole() == Role.CEO) {
            return batchRepository.findByStatus(BatchStatus.ACTIVE).stream()
                    .findFirst()
                    .orElse(null);
        }

        return null;
    }

    private QueryContext analyzeQueryContext(String prompt, List<ChatMessageEntity> pastMessages, Batch activeBatch) {
        String lower = prompt.toLowerCase();
        Integer dayNumber = extractDayNumber(lower);
        String metric = extractMetric(lower);
        boolean isClinical = isClinicalPrompt(lower);
        boolean isManagement = isManagementPrompt(lower);

        // Multi-turn context resolution
        if (dayNumber == null && !pastMessages.isEmpty()) {
            if (lower.contains("next day") || lower.contains("day after")) {
                Integer prevDay = findPreviousReferencedDay(pastMessages);
                if (prevDay != null) {
                    dayNumber = prevDay + 1;
                }
            }
        }

        if (metric == null && !pastMessages.isEmpty()) {
            metric = findPreviousReferencedMetric(pastMessages);
        }

        String category = deduceCategory(prompt, metric, isClinical, isManagement, dayNumber);
        return new QueryContext(dayNumber, metric, isClinical, isManagement, category);
    }

    private Integer extractDayNumber(String text) {
        Pattern p1 = Pattern.compile("\\b(?:day|age)[\\s-]*(\\d+)\\b|\\b(\\d+)(?:st|nd|rd|th)\\s*day\\b");
        Matcher m1 = p1.matcher(text);
        if (m1.find()) {
            String numStr = m1.group(1) != null ? m1.group(1) : m1.group(2);
            try {
                return Integer.parseInt(numStr);
            } catch (NumberFormatException ignored) {}
        }

        Map<String, Integer> wordMap = getWordNumberMap();
        for (Map.Entry<String, Integer> entry : wordMap.entrySet()) {
            if (text.contains(entry.getKey())) {
                return entry.getValue();
            }
        }

        Pattern p2 = Pattern.compile("\\b(?:what about|and|how about|on)\\s+(\\d+)\\b");
        Matcher m2 = p2.matcher(text);
        if (m2.find()) {
            try {
                int val = Integer.parseInt(m2.group(1));
                if (val >= 1 && val <= 60) {
                    return val;
                }
            } catch (NumberFormatException ignored) {}
        }

        return null;
    }

    private Map<String, Integer> getWordNumberMap() {
        Map<String, Integer> map = new LinkedHashMap<>();
        map.put("first day", 1); map.put("day one", 1);
        map.put("second day", 2); map.put("day two", 2);
        map.put("third day", 3); map.put("day three", 3);
        map.put("fourth day", 4); map.put("day four", 4);
        map.put("fifth day", 5); map.put("day five", 5);
        map.put("sixth day", 6); map.put("day six", 6);
        map.put("seventh day", 7); map.put("day seven", 7);
        map.put("eighth day", 8); map.put("day eight", 8);
        map.put("ninth day", 9); map.put("day nine", 9);
        map.put("tenth day", 10); map.put("day ten", 10);
        map.put("eleventh day", 11); map.put("day eleven", 11);
        map.put("twelfth day", 12); map.put("day twelve", 12);
        map.put("thirteenth day", 13); map.put("day thirteen", 13);
        map.put("fourteenth day", 14); map.put("day fourteen", 14);
        map.put("fifteenth day", 15); map.put("day fifteen", 15);
        map.put("sixteenth day", 16); map.put("day sixteen", 16);
        map.put("seventeenth day", 17); map.put("day seventeen", 17);
        map.put("eighteenth day", 18); map.put("day eighteen", 18);
        map.put("nineteenth day", 19); map.put("day nineteen", 19);
        map.put("twentieth day", 20); map.put("day twenty", 20);
        map.put("twenty-first day", 21); map.put("day twenty one", 21);
        map.put("twenty-second day", 22); map.put("day twenty two", 22);
        map.put("twenty-third day", 23); map.put("day twenty three", 23);
        map.put("twenty-fourth day", 24); map.put("day twenty four", 24);
        map.put("twenty-fifth day", 25); map.put("day twenty five", 25);
        return map;
    }

    private String extractMetric(String lower) {
        boolean hasTemporalWord = lower.contains("when") || lower.contains("last") || lower.contains("latest")
                || lower.contains("recent") || lower.contains("date") || lower.contains("time")
                || lower.contains("first") || lower.contains("newest") || lower.contains("previous");

        boolean hasFeedDeliveryWord = lower.contains("load") || lower.contains("deliver") || lower.contains("arrival")
                || lower.contains("received") || lower.contains("stocked") || lower.contains("added")
                || lower.contains("supply") || lower.contains("supplied");

        boolean hasFeedWord = lower.contains("feed");

        // 1. Explicit Temporal Feed Delivery / Loading Inquiries
        // e.g. "When was the last feed stock loaded?", "When was feed delivered?", "What was our last feed load?"
        if ((hasTemporalWord && hasFeedWord) || (hasFeedWord && hasFeedDeliveryWord) || (lower.contains("stock loaded")) || (lower.contains("last delivery"))) {
            if (!lower.contains("remaining") && !lower.contains("balance") && !lower.contains("left") && !lower.contains("how much feed is left") && !lower.contains("how much feed left") && !lower.contains("how much feed do we have")) {
                return "FEED_DELIVERY";
            }
        }

        // 2. Specific Feed Stock Remaining Inquiries
        if (lower.contains("feed stock") || lower.contains("feed balance") || lower.contains("bags left")
                || lower.contains("stock remaining") || lower.contains("feed remaining")
                || lower.contains("how much feed is left") || lower.contains("how much feed left")
                || lower.contains("how much feed do we have") || lower.contains("current stock") || lower.contains("current feed")) {
            return "FEED_STOCK";
        }

        // 3. Feed Consumption Inquiries
        if (lower.contains("feed intake") || lower.contains("feed consumed") || lower.contains("feed consumption")
                || lower.contains("consumed kg") || lower.contains("eaten") || lower.contains("feed used")) {
            return "FEED_CONSUMPTION";
        }

        if (lower.contains("sold") || lower.contains("sales") || lower.contains("revenue") || lower.contains("lifting") || lower.contains("birds sold")) {
            return "SALES";
        }
        if (lower.contains("lowest mortality") || lower.contains("highest mortality")) {
            return "MORTALITY_COMPARISON";
        }
        if (lower.contains("compare") || lower.contains("previous batch") || lower.contains("history")) {
            return "COMPARE";
        }
        if (lower.contains("mortality") || lower.contains("died") || lower.contains("dead") || lower.contains("death") || lower.contains("die")) {
            return "MORTALITY";
        }
        if (lower.contains("live bird") || lower.contains("remaining bird") || lower.contains("bird count") || lower.contains("birds left") || lower.contains("how many birds") || lower.contains("live count") || lower.contains("birds alive")) {
            return "LIVE_BIRDS";
        }
        if (lower.contains("weight") || lower.contains("weigh") || lower.contains("heavy") || lower.contains("grams") || lower.contains("gain")) {
            return "WEIGHT";
        }
        if (lower.contains("fcr") || lower.contains("feed conversion")) {
            return "FCR";
        }
        if (lower.contains("vaccin") || lower.contains("gumboro") || lower.contains("lasota") || lower.contains("marek") || lower.contains("immuniz")) {
            return "VACCINE";
        }
        if (lower.contains("expense") || lower.contains("cost") || lower.contains("spent") || lower.contains("spending")) {
            return "EXPENSE";
        }
        if (lower.contains("remark") || lower.contains("note") || lower.contains("observation")) {
            return "REMARK";
        }
        if (lower.contains("age") || lower.contains("how old") || lower.contains("what day are we")) {
            return "AGE";
        }
        if (lower.contains("summary") || lower.contains("overview") || lower.contains("status") || lower.contains("performance") || lower.contains("current batch") || lower.contains("my batch") || lower.contains("analyze")) {
            return "SUMMARY";
        }
        return null;
    }

    private boolean isClinicalPrompt(String lower) {
        return lower.contains("cough") || lower.contains("snick") || lower.contains("gasp") || lower.contains("rattle")
                || lower.contains("diarrhea") || lower.contains("droppings") || lower.contains("bloody") || lower.contains("white diarrhea")
                || lower.contains("paralysis") || lower.contains("torticollis") || lower.contains("twisted neck")
                || lower.contains("coccidiosis") || lower.contains("newcastle") || lower.contains("gumboro") || lower.contains("bronchitis")
                || lower.contains("sick") || lower.contains("disease") || lower.contains("treatment") || lower.contains("infection")
                || lower.contains("antibiotic") || lower.contains("dose") || lower.contains("dosage") || lower.contains("medicine") || lower.contains("tornic") || lower.contains("enrofloxacin")
                || lower.contains("warning signs") || lower.contains("symptom");
    }

    private boolean isManagementPrompt(String lower) {
        return lower.contains("heat") || lower.contains("panting") || lower.contains("summer") || lower.contains("temperature")
                || lower.contains("ventilation") || lower.contains("airflow") || lower.contains("ammonia") || lower.contains("litter")
                || lower.contains("biosecurity") || lower.contains("water line") || lower.contains("lighting") || lower.contains("brooding");
    }

    private Integer findPreviousReferencedDay(List<ChatMessageEntity> pastMessages) {
        for (int i = pastMessages.size() - 1; i >= 0; i--) {
            ChatMessageEntity msg = pastMessages.get(i);
            Integer day = extractDayNumber(msg.getText().toLowerCase());
            if (day != null) return day;
        }
        return null;
    }

    private String findPreviousReferencedMetric(List<ChatMessageEntity> pastMessages) {
        for (int i = pastMessages.size() - 1; i >= 0; i--) {
            ChatMessageEntity msg = pastMessages.get(i);
            String m = extractMetric(msg.getText().toLowerCase());
            if (m != null) return m;
        }
        return "MORTALITY";
    }

    private String deduceCategory(String prompt, String metric, boolean isClinical, boolean isManagement, Integer dayNumber) {
        String p = prompt.toLowerCase();
        if (p.contains("medicine") || p.contains("dose") || p.contains("dosage") || p.contains("tornic") || p.contains("antibiotic") || p.contains("enrofloxacin")) return "Medication Safety";
        if (p.contains("heat") || p.contains("summer") || p.contains("panting")) return "Heat Stress Management";
        if (p.contains("warning") || p.contains("cough") || p.contains("sick") || p.contains("sneeze") || p.contains("respiratory") || isClinical) return "Health & Warning Signs";
        if ("FEED_DELIVERY".equals(metric)) return "Feed Deliveries & Logistics";
        if ("FEED_STOCK".equals(metric) || "FEED_CONSUMPTION".equals(metric)) return "Feed & Inventory";
        if ("LIVE_BIRDS".equals(metric)) return "Flock Count & Population";
        if ("WEIGHT".equals(metric) || p.contains("weight") || p.contains("gain")) return "Weight & Growth";
        if ("FCR".equals(metric) || p.contains("fcr")) return "FCR & Efficiency";
        if (p.contains("lowest mortality") || p.contains("highest mortality") || "MORTALITY_COMPARISON".equals(metric)) return "Mortality Analysis";
        if ("COMPARE".equals(metric) || p.contains("compare") || p.contains("previous batch") || p.contains("history")) return "Comparative Performance";
        if ("MORTALITY".equals(metric)) return "Mortality Analysis";
        if ("VACCINE".equals(metric)) return "Vaccination Schedule & History";
        if ("SALES".equals(metric) || "EXPENSE".equals(metric)) return "Sales & Financials";
        if (p.contains("current batch") || p.contains("active batch") || p.contains("my batch") || p.contains("analyze my batch")) return "Current Batch Analysis";
        if (dayNumber != null) return "Day " + dayNumber + " Record";
        return "Farm Intelligence & Operations";
    }

    private DatabaseEvidence gatherDatabaseEvidence(Batch activeBatch, QueryContext ctx, String userPrompt, User user) {
        if (activeBatch == null) {
            if (user.getRole() == Role.CEO) {
                List<Batch> allBatches = batchRepository.findAll();
                List<Batch> activeBatches = batchRepository.findByStatus(BatchStatus.ACTIVE);
                List<Batch> completedBatches = batchRepository.findByStatus(BatchStatus.COMPLETED);

                int totalActiveBirds = activeBatches.stream().mapToInt(Batch::getInitialBirds).sum();
                int totalTrackedBirds = allBatches.stream().mapToInt(Batch::getInitialBirds).sum();

                StringBuilder sb = new StringBuilder();
                sb.append("=== ENTERPRISE FLOCK OVERVIEW (CEO SUITE) ===\n");
                sb.append(String.format("Total Registered Batches: %d (%d Active, %d Completed)\n", allBatches.size(), activeBatches.size(), completedBatches.size()));
                sb.append(String.format("Total Active Birds Placed: %,d birds\n", totalActiveBirds));
                sb.append(String.format("Total Tracked Lifetime Birds: %,d birds\n", totalTrackedBirds));

                String dynamicAnswer = String.format("### 🏢 Enterprise Overview\n\n- **Active Batches:** %d batches (%,d birds in production)\n- **Completed Batches:** %d batches in archive\n- **Total Batches Tracked:** %d batches (%,d lifetime birds placed)",
                        activeBatches.size(), totalActiveBirds, completedBatches.size(), allBatches.size(), totalTrackedBirds);

                return new DatabaseEvidence(false, sb.toString(), dynamicAnswer, Map.of(
                        "totalBatches", allBatches.size(),
                        "activeBatches", activeBatches.size(),
                        "totalActiveBirds", totalActiveBirds
                ));
            }

            return new DatabaseEvidence(true, "No active batch found.", "You currently do not have an active batch.", Collections.emptyMap());
        }

        Long batchId = activeBatch.getId();
        Map<String, Object> dataPoints = new LinkedHashMap<>();
        StringBuilder evidence = new StringBuilder();

        // 1. Core Batch Profile
        int flockAge = calculateAge(activeBatch.getStartDate());
        Map<String, Object> overview = flockDataTools.getFlockOverview(batchId);
        dataPoints.put("flockOverview", overview);

        evidence.append(String.format("=== BATCH PROFILE: %s ===\n", activeBatch.getBatchCode()));
        evidence.append(String.format("Status: %s | Start Date: %s | Current Age: Day %d\n", activeBatch.getStatus(), activeBatch.getStartDate(), flockAge));
        evidence.append(String.format("Initial Birds Placed: %,d | Current Live Birds: %,d | Cumulative Mortality: %,d (%.2f%%)\n",
                overview.get("initialBirds"), overview.get("remainingLiveBirds"), overview.get("cumulativeMortality"), ((Number) overview.get("mortalityPercentage")).doubleValue()));
        evidence.append(String.format("Latest Recorded Avg Weight: %s g | Cumulative FCR: %s\n", overview.get("latestAverageWeightG"), overview.get("cumulativeFCR")));
        evidence.append(String.format("Current Remaining Feed Stock: %s kg (%s bags)\n\n", overview.get("currentFeedStockKg"), overview.get("currentFeedStockBags")));

        // 2. Day-Specific Record if requested
        boolean dayRecordMissing = false;
        Map<String, Object> targetDayRecord = null;
        if (ctx.getDayNumber() != null) {
            targetDayRecord = flockDataTools.getDayRecord(batchId, ctx.getDayNumber());
            boolean found = Boolean.TRUE.equals(targetDayRecord.get("found"));
            if (!found) {
                dayRecordMissing = true;
            } else {
                dataPoints.put("dayRecord", targetDayRecord);
                evidence.append(String.format("=== SPECIFIC QUERY RECORD: DAY %d ===\n", ctx.getDayNumber()));
                evidence.append(String.format("Date: %s | Daily Mortality: %s (Morning: %s, Afternoon: %s)\n",
                        targetDayRecord.get("recordDate"), targetDayRecord.get("mortality"), targetDayRecord.get("morningMortality"), targetDayRecord.get("afternoonMortality")));
                evidence.append(String.format("Cumulative Mortality to Day %d: %s birds (%.2f%%) | Remaining Live Birds: %,d\n",
                        ctx.getDayNumber(), targetDayRecord.get("cumulativeMortality"), ((Number) targetDayRecord.get("cumulativeMortalityPercentage")).doubleValue(), ((Number) targetDayRecord.get("remainingBirds")).intValue()));
                evidence.append(String.format("Feed Consumed: %s kg (%s bags of %s) | Closing Stock: %s bags\n",
                        targetDayRecord.get("feedConsumedKg"), targetDayRecord.get("feedBagsConsumed"), targetDayRecord.get("feedType"), targetDayRecord.get("closingFeedStockBags")));
                evidence.append(String.format("Average Bird Weight: %s g | Day FCR: %s (Standard: %s)\n",
                        targetDayRecord.get("averageWeightG"), targetDayRecord.get("fcr"), targetDayRecord.get("standardFcr")));
                if (targetDayRecord.get("notes") != null && !targetDayRecord.get("notes").toString().isBlank()) {
                    evidence.append(String.format("Farmer Daily Notes: \"%s\"\n", targetDayRecord.get("notes")));
                }
                evidence.append("\n");
            }
        }

        // 3. Feed Deliveries & Inventory (Exact MySQL Records)
        Map<String, Object> feedSummary = flockDataTools.getFeedStockAndConsumption(batchId);
        dataPoints.put("feedSummary", feedSummary);
        evidence.append("=== FEED DELIVERIES & INVENTORY (MYSQL DATABASE) ===\n");

        @SuppressWarnings("unchecked")
        Map<String, Object> latestDeliv = (Map<String, Object>) feedSummary.get("latestDelivery");
        if (latestDeliv != null) {
            String lDate = latestDeliv.get("formattedDate") != null ? latestDeliv.get("formattedDate").toString() : latestDeliv.get("date").toString();
            evidence.append(String.format("LATEST FEED DELIVERY / LOAD RECORD:\n  - Delivery Date: %s (%s)\n  - Feed Type: %s\n  - Quantity: %s bags (%s kg/bag = %,.0f kg total)\n\n",
                    lDate, latestDeliv.get("date"), latestDeliv.get("feedType"), latestDeliv.get("bags"),
                    latestDeliv.get("weightPerBagKg"), ((Number) latestDeliv.get("totalWeightKg")).doubleValue()));
        } else {
            evidence.append("LATEST FEED DELIVERY RECORD: None recorded yet\n\n");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> allLoads = (List<Map<String, Object>>) feedSummary.get("deliveries");
        if (allLoads != null && !allLoads.isEmpty()) {
            evidence.append("ALL RECORDED FEED DELIVERIES:\n");
            for (Map<String, Object> l : allLoads) {
                String dDate = l.get("formattedDate") != null ? l.get("formattedDate").toString() : l.get("date").toString();
                evidence.append(String.format("  * [%s] %s — %s bags (%,.0f kg)\n",
                        dDate, l.get("feedType"), l.get("bags"), ((Number) l.get("totalWeightKg")).doubleValue()));
            }
            evidence.append("\n");
        }

        evidence.append(String.format("FEED INVENTORY & CONSUMPTION SUMMARY:\n  - Total Feed Loaded to Date: %,.2f kg (%,.1f bags)\n  - Total Feed Consumed to Date: %,.2f kg (%,.1f bags)\n  - Current Remaining Stock Balance: %,.2f kg (%,.1f bags)\n  - Latest Daily Intake: %s kg\n  - Estimated Feed Remaining: %s days\n\n",
                ((Number) feedSummary.get("totalLoadedKg")).doubleValue(),
                ((Number) feedSummary.get("totalLoadedBags")).doubleValue(),
                ((Number) feedSummary.get("totalConsumedKg")).doubleValue(),
                ((Number) feedSummary.get("totalConsumedBags")).doubleValue(),
                ((Number) feedSummary.get("currentStockKg")).doubleValue(),
                ((Number) feedSummary.get("currentStockBags")).doubleValue(),
                feedSummary.get("latestDailyIntakeKg"),
                feedSummary.get("estimatedDaysOfFeedRemaining")));

        // 4. Growth and Weight Metrics
        Map<String, Object> growthSummary = flockDataTools.getGrowthAndFcrMetrics(batchId);
        dataPoints.put("growthSummary", growthSummary);

        // 5. Vaccination Records
        Map<String, Object> vaxSummary = flockDataTools.getVaccinationHistory(batchId);
        dataPoints.put("vaccines", vaxSummary);
        evidence.append("=== VACCINATION RECORDS ===\n");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> vList = (List<Map<String, Object>>) vaxSummary.get("vaccinationRecords");
        if (vList != null && !vList.isEmpty()) {
            for (Map<String, Object> v : vList) {
                evidence.append(String.format("- %s (Administered on: %s, Flock Age: Day %s)\n", v.get("vaccineName"), v.get("givenDate"), v.get("ageDays")));
            }
        } else {
            evidence.append("No vaccinations logged yet for this batch.\n");
        }
        evidence.append("\n");

        // 6. Recent Observations & Remarks
        Map<String, Object> remSummary = flockDataTools.getRecentObservationsAndRemarks(batchId);
        dataPoints.put("remarks", remSummary);
        evidence.append("=== RECENT FARMER / CLINICAL OBSERVATIONS ===\n");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rList = (List<Map<String, Object>>) remSummary.get("remarks");
        if (rList != null && !rList.isEmpty()) {
            for (Map<String, Object> r : rList) {
                evidence.append(String.format("- [%s] %s: %s\n", r.get("date"), r.get("author"), r.get("note")));
            }
        } else {
            evidence.append("No clinical observations or notes recorded.\n");
        }
        evidence.append("\n");

        // 7. Sales & Lifting Summary
        Map<String, Object> salesSummary = flockDataTools.getFinancialSummary(batchId);
        dataPoints.put("sales", salesSummary);
        evidence.append("=== SALES & LIFTING ===\n");
        evidence.append(String.format("Total Birds Sold: %,d | Total Sales Revenue: $%,.2f | Lifting Entries: %s\n",
                salesSummary.get("totalBirdsSold"), ((Number) salesSummary.get("totalSalesRevenue")).doubleValue(), salesSummary.get("salesEntriesCount")));

        // Build Dynamic Database Fallback Answer (computed strictly from MySQL data)
        String dynamicAnswer = buildDynamicDatabaseAnswer(ctx, activeBatch, overview, targetDayRecord, feedSummary, salesSummary, remSummary, growthSummary, vaxSummary, user);

        return new DatabaseEvidence(dayRecordMissing, evidence.toString(), dynamicAnswer, dataPoints);
    }

    private String buildDynamicDatabaseAnswer(
            QueryContext ctx,
            Batch activeBatch,
            Map<String, Object> overview,
            Map<String, Object> dayRecord,
            Map<String, Object> feedSummary,
            Map<String, Object> salesSummary,
            Map<String, Object> remSummary,
            Map<String, Object> growthSummary,
            Map<String, Object> vaxSummary,
            User user
    ) {
        if (dayRecord != null && Boolean.TRUE.equals(dayRecord.get("found"))) {
            int day = ctx.getDayNumber();
            String metric = ctx.getMetric() != null ? ctx.getMetric() : "ALL";

            if ("MORTALITY".equals(metric)) {
                return String.format("On **Day %d** of batch `%s`, recorded mortality was **%s birds** (%s in the morning, %s in the afternoon). Cumulative mortality reached **%s birds** (%.2f%%), with **%,d** live birds remaining.",
                        day, activeBatch.getBatchCode(), dayRecord.get("mortality"), dayRecord.get("morningMortality"), dayRecord.get("afternoonMortality"),
                        dayRecord.get("cumulativeMortality"), ((Number) dayRecord.get("cumulativeMortalityPercentage")).doubleValue(),
                        ((Number) dayRecord.get("remainingBirds")).intValue());
            }

            if ("WEIGHT".equals(metric)) {
                return String.format("On **Day %d**, the recorded average bird weight for batch `%s` was **%s g**.", day, activeBatch.getBatchCode(), dayRecord.get("averageWeightG"));
            }

            if ("FEED".equals(metric) || "FEED_CONSUMPTION".equals(metric)) {
                return String.format("On **Day %d**, the flock consumed **%s kg** (%s bags of %s feed).", day, dayRecord.get("feedConsumedKg"), dayRecord.get("feedBagsConsumed"), dayRecord.get("feedType"));
            }

            if ("FCR".equals(metric)) {
                return String.format("On **Day %d**, the recorded Feed Conversion Ratio (FCR) was **%s** (standard benchmark: %s).", day, dayRecord.get("fcr"), dayRecord.get("standardFcr"));
            }

            return String.format("### 📋 Day %d Telemetry (`%s`)\n- **Mortality:** %s birds (%s morning, %s afternoon)\n- **Cumulative Mortality:** %s birds (%.2f%%)\n- **Remaining Live Birds:** %,d birds\n- **Feed Consumed:** %s kg (%s bags)\n- **Average Weight:** %s g\n- **FCR:** %s",
                    day, activeBatch.getBatchCode(), dayRecord.get("mortality"), dayRecord.get("morningMortality"), dayRecord.get("afternoonMortality"),
                    dayRecord.get("cumulativeMortality"), ((Number) dayRecord.get("cumulativeMortalityPercentage")).doubleValue(),
                    ((Number) dayRecord.get("remainingBirds")).intValue(), dayRecord.get("feedConsumedKg"), dayRecord.get("feedBagsConsumed"),
                    dayRecord.get("averageWeightG"), dayRecord.get("fcr"));
        }

        if ("FEED_DELIVERY".equals(ctx.getMetric())) {
            @SuppressWarnings("unchecked")
            Map<String, Object> latestLoad = (Map<String, Object>) feedSummary.get("latestDelivery");
            if (latestLoad != null) {
                String dDate = latestLoad.get("formattedDate") != null ? latestLoad.get("formattedDate").toString() : latestLoad.get("date").toString();
                return String.format("The last feed stock was loaded on **%s** — **%s %s bags** (**%,.0f kg** at %s kg/bag).",
                        dDate, latestLoad.get("bags"), latestLoad.get("feedType"),
                        ((Number) latestLoad.get("totalWeightKg")).doubleValue(), latestLoad.get("weightPerBagKg"));
            }
            return String.format("No feed load deliveries have been recorded for batch `%s` yet.", activeBatch.getBatchCode());
        }

        if ("FEED_STOCK".equals(ctx.getMetric())) {
            return String.format("Current feed stock remaining for batch `%s` is **%,.0f kg** (approx. **%s bags**). Total loaded: **%,.0f kg**, total consumed: **%,.0f kg**.",
                    activeBatch.getBatchCode(),
                    ((Number) feedSummary.get("currentStockKg")).doubleValue(),
                    feedSummary.get("currentStockBags"),
                    ((Number) feedSummary.get("totalLoadedKg")).doubleValue(),
                    ((Number) feedSummary.get("totalConsumedKg")).doubleValue());
        }

        if ("FEED_CONSUMPTION".equals(ctx.getMetric())) {
            return String.format("Total feed consumed to date for batch `%s` is **%,.0f kg** (approx. **%s bags**). Latest daily intake was **%s kg**.",
                    activeBatch.getBatchCode(),
                    ((Number) feedSummary.get("totalConsumedKg")).doubleValue(),
                    feedSummary.get("totalConsumedBags"),
                    feedSummary.get("latestDailyIntakeKg"));
        }

        if ("LIVE_BIRDS".equals(ctx.getMetric()) || "Flock Count & Population".equals(ctx.getCategory())) {
            return String.format("Current live bird count for batch `%s` is **%,d birds** (out of %,d initial birds placed). Cumulative mortality is **%s birds** (%.2f%%).",
                    activeBatch.getBatchCode(),
                    ((Number) overview.get("remainingLiveBirds")).intValue(),
                    ((Number) overview.get("initialBirds")).intValue(),
                    overview.get("cumulativeMortality"),
                    ((Number) overview.get("mortalityPercentage")).doubleValue());
        }

        if ("MORTALITY".equals(ctx.getMetric())) {
            return String.format("Current cumulative mortality for batch `%s` is **%s birds** (%.2f%%) out of %,d initial birds placed. Remaining live birds: **%,d**.",
                    activeBatch.getBatchCode(),
                    overview.get("cumulativeMortality"),
                    ((Number) overview.get("mortalityPercentage")).doubleValue(),
                    ((Number) overview.get("initialBirds")).intValue(),
                    ((Number) overview.get("remainingLiveBirds")).intValue());
        }

        if ("WEIGHT".equals(ctx.getMetric()) || "Weight & Growth".equals(ctx.getCategory())) {
            BigDecimal latestWeight = growthSummary != null && growthSummary.get("latestWeightG") instanceof BigDecimal ? (BigDecimal) growthSummary.get("latestWeightG") : BigDecimal.ZERO;
            Object prevWeight = growthSummary != null ? growthSummary.get("previousWeightG") : "None";
            BigDecimal gain = growthSummary != null && growthSummary.get("weightGainG") instanceof BigDecimal ? (BigDecimal) growthSummary.get("weightGainG") : BigDecimal.ZERO;
            String gainStr = gain.compareTo(BigDecimal.ZERO) >= 0 ? "+" + gain : gain.toString();

            return String.format("The latest recorded average bird weight for batch `%s` is **%s g** (previous: %s g, gain: **%s g**). Cumulative FCR is **%s** at Day %s.",
                    activeBatch.getBatchCode(), latestWeight, prevWeight, gainStr, overview.get("cumulativeFCR"), overview.get("ageInDays"));
        }

        if ("VACCINE".equals(ctx.getMetric()) || "Vaccination Schedule & History".equals(ctx.getCategory())) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> vList = (List<Map<String, Object>>) vaxSummary.get("vaccinationRecords");
            if (vList == null || vList.isEmpty()) {
                return String.format("No vaccination records have been logged for batch `%s` yet.", activeBatch.getBatchCode());
            }
            StringBuilder sb = new StringBuilder();
            sb.append(String.format("### 💉 Vaccination History for Batch `%s`\n\n", activeBatch.getBatchCode()));
            for (Map<String, Object> v : vList) {
                sb.append(String.format("- **%s** — Administered on **%s** (Flock Age: Day %s)%s\n",
                        v.get("vaccineName"), v.get("givenDate"), v.get("ageDays"),
                        (v.get("remarks") != null && !v.get("remarks").toString().isBlank()) ? " (" + v.get("remarks") + ")" : ""));
            }
            return sb.toString();
        }

        if ("SALES".equals(ctx.getMetric()) || "Sales & Financials".equals(ctx.getCategory())) {
            return String.format("Total sales to date for batch `%s`: **%,d birds sold** across %s lifting entries, generating **$%,.2f** in total revenue.",
                    activeBatch.getBatchCode(),
                    salesSummary.get("totalBirdsSold"),
                    salesSummary.get("salesEntriesCount"),
                    ((Number) salesSummary.get("totalSalesRevenue")).doubleValue());
        }

        if ("Medication Safety".equals(ctx.getCategory())) {
            return """
                    ### ⚠️ Medication & Dosage Safety Advisory
                    The AI Assistant strictly does NOT calculate, prescribe, or invent drug dosages or water dilution concentrations without diagnostic verification.
                    
                    #### 📋 Recommended Safe Protocol:
                    1. **Inspect Product Packaging:** Always check the manufacturer label on the bottle/sachet for the exact active ingredient concentration.
                    2. **Consult a Veterinarian:** Always Consult a Veterinarian or technical field officer before administering prescription therapeutics.
                    3. **Mandatory Slaughter Withdrawal Period:** Observe strict withdrawal periods before marketing.
                    """;
        }

        if ("Heat Stress Management".equals(ctx.getCategory())) {
            return """
                    ### 🌡️ Heat Stress Management Actions
                    1. **Airflow Velocity:** Ensure tunnel fans provide minimum airspeed of 2.5 to 3.0 m/s over birds.
                    2. **Water Line Flushing:** Flush drinking lines regularly to keep water cool (< 24°C / 75°F).
                    3. **Feeding Schedule:** Shift feeding times to early morning and late night to avoid digestion metabolic heat.
                    4. **Electrolytes & Vitamin C:** Supplement drinking water with electrolytes and Vitamin C.
                    """;
        }

        if ("Health & Warning Signs".equals(ctx.getCategory())) {
            StringBuilder healthSb = new StringBuilder();
            healthSb.append(String.format("#### 📊 RECORDED FLOCK STATUS (Batch `%s`)\n", activeBatch.getBatchCode()));
            healthSb.append(String.format("- **Flock Age:** Day %s\n", overview.get("ageInDays")));
            healthSb.append(String.format("- **Live Birds:** %,d (Initial: %,d)\n",
                    ((Number) overview.get("remainingLiveBirds")).intValue(), ((Number) overview.get("initialBirds")).intValue()));
            healthSb.append(String.format("- **Cumulative Mortality:** %s (%.2f%%)\n",
                    overview.get("cumulativeMortality"), ((Number) overview.get("mortalityPercentage")).doubleValue()));
            healthSb.append(String.format("- **Latest Avg Weight:** %s g | **Cumulative FCR:** %s\n\n",
                    overview.get("latestAverageWeightG"), overview.get("cumulativeFCR")));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rList = (List<Map<String, Object>>) remSummary.get("remarks");
            if (rList != null && !rList.isEmpty()) {
                healthSb.append("#### 📝 RECENT FLOCK OBSERVATIONS & REMARKS\n");
                for (Map<String, Object> r : rList) {
                    healthSb.append(String.format("- **%s:** %s\n", r.get("date"), r.get("note")));
                }
                healthSb.append("\n");
            }

            healthSb.append("#### 🔍 POSSIBLE CAUSES & CLINICAL EVALUATION\n");
            healthSb.append("- Review ventilation, ammonia levels, and observed respiratory symptoms. Consult your technical veterinarian if mortality rises.\n");
            return healthSb.toString();
        }

        if ("COMPARE".equals(ctx.getMetric()) || "Comparative Performance".equals(ctx.getCategory()) || "Mortality Analysis".equals(ctx.getCategory())) {
            Farmer farmer = farmerRepository.findByUserId(user.getId()).orElse(null);
            List<Batch> farmerBatches = farmer != null ? batchRepository.findByFarmerIdOrderByStartDateDesc(farmer.getId()) : batchRepository.findAll();

            StringBuilder sb = new StringBuilder();
            sb.append("### 📈 Comparative Performance & Batch Comparison\n\n");
            sb.append("Here is the performance comparison across your recorded batches:\n\n");

            Batch lowestMortBatch = null;
            double lowestMortRate = 999.0;

            for (Batch b : farmerBatches) {
                Map<String, Object> ov = flockDataTools.getFlockOverview(b.getId());
                int initial = ((Number) ov.get("initialBirds")).intValue();
                int mort = ((Number) ov.get("cumulativeMortality")).intValue();
                double mortPct = ((Number) ov.get("mortalityPercentage")).doubleValue();

                sb.append(String.format("- **Batch `%s` (%s):** %,d initial birds, **%s mortalities** (%.2f%%), Latest avg weight: %s g\n",
                        b.getBatchCode(), b.getStatus(), initial, mort, mortPct, ov.get("latestAverageWeightG")));

                if (mortPct < lowestMortRate && initial > 0) {
                    lowestMortRate = mortPct;
                    lowestMortBatch = b;
                }
            }

            if (lowestMortBatch != null) {
                sb.append(String.format("\n🏆 **Lowest Mortality Batch:** Batch `%s` with only **%.2f%%** cumulative mortality rate.\n",
                        lowestMortBatch.getBatchCode(), lowestMortRate));
            }

            return sb.toString();
        }

        // Standard Batch Overview
        return String.format("The current batch (`%s`) has **%,d** initial birds placed on %s. Currently at Day **%s**, there are **%,d** remaining live birds with **%s** recorded mortalities (%.2f%%), average weight of **%s g**, and **%,.0f kg** of feed in stock.",
                activeBatch.getBatchCode(),
                ((Number) overview.get("initialBirds")).intValue(),
                activeBatch.getStartDate(),
                overview.get("ageInDays"),
                ((Number) overview.get("remainingLiveBirds")).intValue(),
                overview.get("cumulativeMortality"),
                ((Number) overview.get("mortalityPercentage")).doubleValue(),
                overview.get("latestAverageWeightG"),
                ((Number) overview.get("currentFeedStockKg")).doubleValue());
    }

    private List<String> extractDynamicCauses(String answer, List<KnowledgeMatch> matches, QueryContext ctx) {
        Set<String> causes = new LinkedHashSet<>();
        for (KnowledgeMatch km : matches) {
            if (km.getTopic() != null && !km.getTopic().isBlank()) {
                causes.add(km.getTopic());
            }
        }

        String lower = answer.toLowerCase();
        if (lower.contains("infectious bronchitis") || lower.contains(" ib ")) causes.add("Infectious Bronchitis (IB)");
        if (lower.contains("newcastle") || lower.contains(" nd ")) causes.add("Newcastle Disease (ND)");
        if (lower.contains("coccidiosis")) causes.add("Coccidiosis (Eimeria spp.)");
        if (lower.contains("infectious bursal disease") || lower.contains("gumboro") || lower.contains(" ibd ")) causes.add("Infectious Bursal Disease (Gumboro)");
        if (lower.contains("chronic respiratory disease") || lower.contains(" crd ") || lower.contains("mycoplasma")) causes.add("Chronic Respiratory Disease (CRD)");
        if (lower.contains("heat stress")) causes.add("Acute Heat Stress");
        if (lower.contains("ammonia")) causes.add("High Ammonia & Inadequate Airflow");
        if (lower.contains("ascites") || lower.contains("water belly")) causes.add("Ascites / Pulmonary Hypertension");

        return new ArrayList<>(causes);
    }

    private List<String> extractDynamicActions(String answer, QueryContext ctx) {
        if (!ctx.isClinicalQuery() && !ctx.isManagementQuery()) {
            return Collections.emptyList();
        }

        List<String> actions = new ArrayList<>();
        String[] lines = answer.split("\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if ((trimmed.startsWith("- **") || trimmed.startsWith("1.") || trimmed.startsWith("2.") || trimmed.startsWith("3.") || trimmed.startsWith("•"))
                    && trimmed.length() > 15 && trimmed.length() < 160) {
                String cleaned = trimmed.replaceAll("^[0-9]+\\.\\s*|^-\\s*|^•\\s*|\\*\\*", "").trim();
                actions.add(cleaned);
                if (actions.size() >= 4) break;
            }
        }

        if (actions.isEmpty()) {
            actions.add("Verify ventilation rates and minimize shed temperature fluctuations");
            actions.add("Inspect drinker lines and observe 24-hour mortality trends");
            actions.add("Consult your licensed poultry veterinarian for precise diagnostic testing");
        }

        return actions;
    }

    private List<String> generateKeyInsights(Batch activeBatch, DatabaseEvidence evidence) {
        List<String> insights = new ArrayList<>();
        if (activeBatch != null) {
            insights.add(String.format("Batch %s data verified from MySQL database records", activeBatch.getBatchCode()));
        }
        return insights;
    }

    private List<String> generateFollowUpSuggestions(String prompt, QueryContext ctx, Batch activeBatch) {
        List<String> suggestions = new ArrayList<>();
        if ("FEED_DELIVERY".equals(ctx.getMetric())) {
            suggestions.add("What is our current feed stock remaining?");
            suggestions.add("How much feed was consumed in total?");
            suggestions.add("Check today's mortality");
        } else if ("FEED_STOCK".equals(ctx.getMetric())) {
            suggestions.add("When was the last feed stock loaded?");
            suggestions.add("How many days of feed are remaining?");
            suggestions.add("Check today's mortality");
        } else if (ctx.getDayNumber() != null) {
            int nextDay = ctx.getDayNumber() + 1;
            suggestions.add(String.format("What was the mortality on day %d?", nextDay));
            suggestions.add(String.format("What was the average weight on day %d?", ctx.getDayNumber()));
            suggestions.add("When was the last feed stock loaded?");
        } else if ("MORTALITY".equals(ctx.getMetric())) {
            suggestions.add("What is the current live bird count?");
            suggestions.add("Analyze my bird weight & FCR");
            suggestions.add("When was the last feed stock loaded?");
        } else if (ctx.isClinicalQuery()) {
            suggestions.add("What are the recommended biosecurity steps?");
            suggestions.add("Check recent remarks and observations");
            suggestions.add("What vaccines have been administered?");
        } else {
            suggestions.add("When was the last feed stock loaded?");
            suggestions.add("What is the current live bird count?");
            suggestions.add("Tell the mortality on day 8 of our current batch");
            suggestions.add("Check my feed stock");
        }
        return suggestions;
    }

    private int calculateAge(LocalDate startDate) {
        if (startDate == null) return 1;
        return (int) Math.max(1, ChronoUnit.DAYS.between(startDate, LocalDate.now()) + 1);
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

    private static class QueryContext {
        private final Integer dayNumber;
        private final String metric;
        private final boolean clinicalQuery;
        private final boolean managementQuery;
        private final String category;

        public QueryContext(Integer dayNumber, String metric, boolean clinicalQuery, boolean managementQuery, String category) {
            this.dayNumber = dayNumber;
            this.metric = metric;
            this.clinicalQuery = clinicalQuery;
            this.managementQuery = managementQuery;
            this.category = category;
        }

        public Integer getDayNumber() { return dayNumber; }
        public String getMetric() { return metric; }
        public boolean isClinicalQuery() { return clinicalQuery; }
        public boolean isManagementQuery() { return managementQuery; }
        public String getCategory() { return category; }
    }

    private static class DatabaseEvidence {
        private final boolean requestedRecordMissing;
        private final String evidenceText;
        private final String dynamicDatabaseAnswer;
        private final Map<String, Object> dataPoints;

        public DatabaseEvidence(boolean requestedRecordMissing, String evidenceText, String dynamicDatabaseAnswer, Map<String, Object> dataPoints) {
            this.requestedRecordMissing = requestedRecordMissing;
            this.evidenceText = evidenceText;
            this.dynamicDatabaseAnswer = dynamicDatabaseAnswer;
            this.dataPoints = dataPoints;
        }

        public boolean isRequestedRecordMissing() { return requestedRecordMissing; }
        public String getEvidenceText() { return evidenceText; }
        public String getDynamicDatabaseAnswer() { return dynamicDatabaseAnswer; }
        public Map<String, Object> getDataPoints() { return dataPoints; }
    }
}
