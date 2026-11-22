
package com.poultry.poultrymanagement.config;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Slf4j
@Configuration
public class AiConfig {

    @Value("${ai.provider:${AI_PROVIDER:openai}}")
    private String provider;

    @Value("${ai.api-key:${AI_API_KEY:${LLM_API_KEY:demo-api-key}}}")
    private String apiKey;

    @Value("${ai.base-url:${AI_BASE_URL:${LLM_BASE_URL:}}}")
    private String baseUrl;

    @Value("${ai.model-name:${AI_MODEL:${LLM_MODEL:}}}")
    private String modelName;

    @Value("${ai.temperature:${AI_TEMPERATURE:${LLM_TEMPERATURE:0.2}}}")
    private Double temperature;

    @Value("${ai.timeout-seconds:${AI_TIMEOUT_SECONDS:${LLM_TIMEOUT_SECONDS:60}}}")
    private Long timeoutSeconds;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        String effectiveApiKey = apiKey != null ? apiKey.trim() : "";
        String effectiveProvider = provider != null ? provider.trim().toLowerCase() : "openai";
        String effectiveBaseUrl = baseUrl != null ? baseUrl.trim() : "";
        String effectiveModel = modelName != null ? modelName.trim() : "";

        // Auto-detect & Normalize provider URLs and models
        if ("gemini".equalsIgnoreCase(effectiveProvider) || "google".equalsIgnoreCase(effectiveProvider) || effectiveApiKey.startsWith("AIza")) {
            if (effectiveBaseUrl.isEmpty() || effectiveBaseUrl.contains("api.openai.com") || !effectiveBaseUrl.contains("generativelanguage.googleapis.com")) {
                effectiveBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai/";
            }
            if (effectiveModel.isEmpty() || "gpt-4o-mini".equalsIgnoreCase(effectiveModel)) {
                effectiveModel = "gemini-1.5-flash";
            }
            log.info("🤖 AI Chatbot Engine: Configured Google Gemini (Model: {}, Endpoint: {})", effectiveModel, effectiveBaseUrl);
        } else if ("groq".equalsIgnoreCase(effectiveProvider) || effectiveApiKey.startsWith("gsk_")) {
            // Normalize Groq URL (e.g. if user entered https://groq.com or https://api.groq.com)
            if (effectiveBaseUrl.isEmpty() || effectiveBaseUrl.contains("api.openai.com") || !effectiveBaseUrl.contains("/openai/v1")) {
                effectiveBaseUrl = "https://api.groq.com/openai/v1";
            }
            if (effectiveModel.isEmpty() || "gpt-4o-mini".equalsIgnoreCase(effectiveModel) || "llama-3.1-8b-instant".equalsIgnoreCase(effectiveModel)) {
                effectiveModel = "qwen/qwen3.8-27b";
            }
            log.info("🤖 AI Chatbot Engine: Configured Groq Cloud (Model: {}, Endpoint: {})", effectiveModel, effectiveBaseUrl);
        } else if ("openrouter".equalsIgnoreCase(effectiveProvider) || effectiveApiKey.startsWith("sk-or-")) {
            if (effectiveBaseUrl.isEmpty() || effectiveBaseUrl.contains("api.openai.com")) {
                effectiveBaseUrl = "https://openrouter.ai/api/v1";
            }
            if (effectiveModel.isEmpty() || "gpt-4o-mini".equalsIgnoreCase(effectiveModel)) {
                effectiveModel = "google/gemini-2.0-flash-001";
            }
            log.info("🤖 AI Chatbot Engine: Configured OpenRouter (Model: {}, Endpoint: {})", effectiveModel, effectiveBaseUrl);
        } else if ("ollama".equalsIgnoreCase(effectiveProvider)) {
            if (effectiveBaseUrl.isEmpty()) {
                effectiveBaseUrl = "http://localhost:11434/v1";
            }
            if (effectiveModel.isEmpty()) {
                effectiveModel = "llama3.2";
            }
            log.info("🤖 AI Chatbot Engine: Configured Local Ollama (Model: {}, Endpoint: {})", effectiveModel, effectiveBaseUrl);
        } else {
            // Default OpenAI
            if (effectiveBaseUrl.isEmpty()) {
                effectiveBaseUrl = "https://api.openai.com/v1";
            }
            if (effectiveModel.isEmpty()) {
                effectiveModel = "gpt-4o-mini";
            }
            log.info("🤖 AI Chatbot Engine: Configured OpenAI (Model: {}, Endpoint: {})", effectiveModel, effectiveBaseUrl);
        }

        if (effectiveApiKey.isEmpty() || "demo-api-key".equalsIgnoreCase(effectiveApiKey)) {
            log.warn("⚠️ [AI ENGINE NOTICE] No live AI API key found (current key is '{}').", effectiveApiKey);
            log.warn("👉 Set 'ai.api-key=YOUR_KEY' in backend/src/main/resources/application.properties or export AI_API_KEY.");
        } else {
            log.info("✅ [AI ENGINE ACTIVE] Live API Key detected! Real AI language model generation is ENABLED with provider: {}", effectiveProvider);
        }

        return OpenAiChatModel.builder()
                .apiKey(effectiveApiKey.isEmpty() ? "demo-api-key" : effectiveApiKey)
                .baseUrl(effectiveBaseUrl)
                .modelName(effectiveModel)
                .temperature(temperature != null ? temperature : 0.2)
                .timeout(Duration.ofSeconds(timeoutSeconds != null ? timeoutSeconds : 60))
                .maxRetries(2)
                .logRequests(false)
                .logResponses(false)
                .build();
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        log.info("🧠 Initializing in-process high-speed ONNX AllMiniLmL6V2EmbeddingModel (runs entirely locally in JVM)");
        return new AllMiniLmL6V2EmbeddingModel();
    }

    @Bean
    public EmbeddingStore<TextSegment> embeddingStore() {
        log.info("📚 Initializing in-memory embedded vector store for Veterinary Knowledge Base");
        return new InMemoryEmbeddingStore<>();
    }

    @Bean
    public com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        com.fasterxml.jackson.databind.module.SimpleModule trimModule = new com.fasterxml.jackson.databind.module.SimpleModule();
        trimModule.addDeserializer(String.class, new com.fasterxml.jackson.databind.deser.std.StdScalarDeserializer<String>(String.class) {
            @Override
            public String deserialize(com.fasterxml.jackson.core.JsonParser p, com.fasterxml.jackson.databind.DeserializationContext ctxt) throws java.io.IOException {
                String val = p.getValueAsString();
                return val != null ? val.trim() : null;
            }
        });
        mapper.registerModule(trimModule);
        return mapper;
    }
}
