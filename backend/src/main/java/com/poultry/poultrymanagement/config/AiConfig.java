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

    @Value("${ai.api-key:demo-api-key}")
    private String apiKey;

    @Value("${ai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${ai.model-name:gpt-4o-mini}")
    private String modelName;

    @Value("${ai.temperature:0.2}")
    private Double temperature;

    @Value("${ai.timeout-seconds:60}")
    private Long timeoutSeconds;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        log.info("Initializing LangChain4j ChatLanguageModel with model: {}, baseUrl: {}", modelName, baseUrl);
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .modelName(modelName)
                .temperature(temperature)
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .maxRetries(2)
                .logRequests(true)
                .logResponses(true)
                .build();
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        log.info("Initializing in-process high-speed ONNX AllMiniLmL6V2EmbeddingModel (runs entirely locally in JVM)");
        return new AllMiniLmL6V2EmbeddingModel();
    }

    @Bean
    public EmbeddingStore<TextSegment> embeddingStore() {
        log.info("Initializing in-memory embedded vector store for Veterinary Knowledge Base");
        return new InMemoryEmbeddingStore<>();
    }

    @Bean
    public com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
        return new com.fasterxml.jackson.databind.ObjectMapper();
    }
}
