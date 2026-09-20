package com.poultry.poultrymanagement.service.ai;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Component
public class VeterinarySafetyGuardrail {

    private static final List<Pattern> PROMPT_INJECTION_PATTERNS = List.of(
            Pattern.compile("(?i)ignore (all )?(previous|above|system) instructions"),
            Pattern.compile("(?i)you are now in developer mode"),
            Pattern.compile("(?i)reveal (your|the) (system )?prompt"),
            Pattern.compile("(?i)(show|give|print) (me )?(database|db|mysql) (credentials|password|users)"),
            Pattern.compile("(?i)drop table "),
            Pattern.compile("(?i)delete from users"),
            Pattern.compile("(?i)select \\* from users"),
            Pattern.compile("(?i)bypass (all )?(safety|veterinary) (rules|guidelines)")
    );

    private static final List<String> EMERGENCY_KEYWORDS = List.of(
            "twisted neck", "torticollis", "stargazing", "paralysis", "blood in droppings",
            "bloody diarrhea", "mass mortality", "dying rapidly", "died suddenly", "cyanotic comb",
            "dark purple comb", "gasps for air", "severe panting", "prostration", "shivering tremors"
    );

    private static final List<String> MEDICATION_KEYWORDS = List.of(
            "enrofloxacin", "doxycycline", "toltrazuril", "amprolium", "tylosin",
            "sulfaclozine", "antibiotic", "dosage", "dose", "mix in water"
    );

    @Getter
    @Builder
    public static class SafetyCheckResult {
        private boolean isSecurityViolation;
        private String securityViolationMessage;
        private boolean isEmergency;
        private List<String> emergencyWarnings;
    }

    public SafetyCheckResult evaluatePrePrompt(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return SafetyCheckResult.builder().build();
        }

        String lower = prompt.toLowerCase();

        // 1. Check for prompt injection / security violations
        for (Pattern p : PROMPT_INJECTION_PATTERNS) {
            if (p.matcher(prompt).find()) {
                log.warn("Security Alert: Prompt injection attempt detected: '{}'", prompt);
                return SafetyCheckResult.builder()
                        .isSecurityViolation(true)
                        .securityViolationMessage("⚠️ **Security Alert:** Request rejected. System instructions, credentials, and safety guardrails cannot be overridden.")
                        .build();
            }
        }

        // 2. Check for clinical emergency triggers
        List<String> detectedEmergencies = new ArrayList<>();
        for (String kw : EMERGENCY_KEYWORDS) {
            if (lower.contains(kw)) {
                detectedEmergencies.add("Emergency symptom detected: '" + kw + "'");
            }
        }

        return SafetyCheckResult.builder()
                .isSecurityViolation(false)
                .isEmergency(!detectedEmergencies.isEmpty())
                .emergencyWarnings(detectedEmergencies)
                .build();
    }

    public String sanitizeAndEnforcePostResponse(String llmOutput, boolean isEmergency) {
        if (llmOutput == null) return "";

        String lower = llmOutput.toLowerCase();
        StringBuilder sanitized = new StringBuilder(llmOutput.trim());

        // Ensure mandatory withdrawal period & vet consultation disclaimer if medications are discussed
        boolean discussesMeds = MEDICATION_KEYWORDS.stream().anyMatch(lower::contains);
        boolean hasVetDisclaimer = lower.contains("veterinarian") || lower.contains("veterinary") || lower.contains("vet");
        boolean hasWithdrawalDisclaimer = lower.contains("withdrawal period") || lower.contains("withdrawal time");

        if (discussesMeds && (!hasVetDisclaimer || !hasWithdrawalDisclaimer)) {
            sanitized.append("\n\n---\n")
                    .append("⚠️ **Mandatory Veterinary & Pharmacological Notice:**\n")
                    .append("- Always verify product packaging active ingredient concentrations and calculate dosage based on live flock weight rather than age alone.\n")
                    .append("- Observe mandatory slaughter withdrawal periods before selling birds for meat.\n")
                    .append("- Consult a licensed poultry veterinarian before administering prescription therapeutics.");
        }

        if (isEmergency && !lower.contains("🚨 **urgent veterinary emergency**")) {
            sanitized.insert(0, "> 🚨 **URGENT VETERINARY ACTION REQUIRED:** Critical symptoms or elevated mortality detected. Contact your flock veterinarian or technical field officer immediately.\n\n");
        }

        return sanitized.toString();
    }
}
