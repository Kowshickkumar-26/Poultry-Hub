package com.poultry.poultrymanagement.config;

import com.poultry.poultrymanagement.service.ai.ResilientEmbeddingModel;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
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

    @Value("${ai.embedding.provider:${EMBEDDING_PROVIDER:openai}}")
    private String embeddingProvider;

    @Value("${ai.embedding.api-key:${EMBEDDING_API_KEY:${OPENAI_API_KEY:}}}")
    private String embeddingApiKey;

    @Value("${ai.embedding.base-url:${EMBEDDING_BASE_URL:}}")
    private String embeddingBaseUrl;

    @Value("${ai.embedding.model-name:${EMBEDDING_MODEL:text-embedding-3-small}}")
    private String embeddingModelName;

    @Value("${ai.embedding.dimensions:${EMBEDDING_DIMENSIONS:384}}")
    private Integer embeddingDimensions;

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

    /**
     * Memory-Safe Embedding Model:
     * - Uses remote Embedding API (OpenAI text-embedding-3-small / Gemini text-embedding-004) if configured.
     * - Falls back to zero-memory lexical feature embeddings if unconfigured or unavailable.
     * - Eliminates in-process ONNX neural models that exhaust JVM heap space on 512MB RAM containers.
     */
    @Bean
    public EmbeddingModel embeddingModel() {
        int dim = (embeddingDimensions != null && embeddingDimensions > 0) ? embeddingDimensions : 384;
        String key = embeddingApiKey != null ? embeddingApiKey.trim() : "";
        String prov = embeddingProvider != null ? embeddingProvider.trim().toLowerCase() : "openai";
        String url = embeddingBaseUrl != null ? embeddingBaseUrl.trim() : "";
        String model = (embeddingModelName != null && !embeddingModelName.isBlank()) ? embeddingModelName.trim() : "text-embedding-3-small";

        EmbeddingModel remoteModel = null;
        if (!key.isEmpty() && !"demo-api-key".equalsIgnoreCase(key)) {
            if ("gemini".equalsIgnoreCase(prov) || "google".equalsIgnoreCase(prov) || key.startsWith("AIza")) {
                if (url.isEmpty() || url.contains("api.openai.com")) {
                    url = "https://generativelanguage.googleapis.com/v1beta/openai/";
                }
                if ("text-embedding-3-small".equalsIgnoreCase(model)) {
                    model = "text-embedding-004";
                }
            } else {
                if (url.isEmpty()) {
                    url = "https://api.openai.com/v1";
                }
            }

            try {
                log.info("🌐 Configuring Remote Embedding Model (Provider: {}, Model: {}, Dimension: {}, BaseUrl: {})",
                        prov, model, dim, url);

                OpenAiEmbeddingModel.OpenAiEmbeddingModelBuilder builder = OpenAiEmbeddingModel.builder()
                        .apiKey(key)
                        .baseUrl(url)
                        .modelName(model)
                        .timeout(Duration.ofSeconds(60))
                        .maxRetries(2);

                if ("text-embedding-3-small".equalsIgnoreCase(model) || "text-embedding-3-large".equalsIgnoreCase(model)) {
                    builder.dimensions(dim);
                }

                remoteModel = builder.build();
                log.info("✅ Remote Embedding Model configured successfully.");
            } catch (Exception e) {
                log.warn("⚠️ Could not configure remote embedding client: {}. Falling back to zero-memory adapter.", e.getMessage());
            }
        } else {
            log.info("ℹ️ No remote EMBEDDING_API_KEY detected. Utilizing zero-memory lexical feature embedding adapter (dimension {}).", dim);
        }

        return new ResilientEmbeddingModel(remoteModel, dim);
    }

    @Bean
    public EmbeddingStore<TextSegment> embeddingStore() {
        log.info("📚 Initializing in-memory vector store for Veterinary Knowledge Base");
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
