package com.poultry.poultrymanagement.service.ai;

import com.poultry.poultrymanagement.entity.KnowledgeDocument;
import com.poultry.poultrymanagement.repository.KnowledgeDocumentRepository;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingSearchResult;
import dev.langchain4j.store.embedding.EmbeddingStore;
import jakarta.annotation.PostConstruct;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class VeterinaryKnowledgeIngestionService {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;
    private final KnowledgeDocumentRepository knowledgeDocumentRepository;

    @Getter
    @Builder
    public static class KnowledgeMatch {
        private String text;
        private double score;
        private String source;
        private String topic;
        private String docName;
    }

    @PostConstruct
    public void init() {
        try {
            log.info("Starting automated ingestion of Veterinary Knowledge Base documents...");
            ingestClasspathKnowledge();
            log.info("Veterinary Knowledge Base successfully ingested and indexed into Vector Store.");
        } catch (Exception e) {
            log.error("Failed to ingest veterinary knowledge base: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void ingestClasspathKnowledge() throws Exception {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:knowledge/*.md");

        if (resources == null || resources.length == 0) {
            log.warn("No knowledge documents found in classpath:knowledge/*.md");
            return;
        }

        for (Resource resource : resources) {
            String filename = resource.getFilename();
            if (filename == null) continue;

            try (InputStream is = resource.getInputStream()) {
                String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                String topic = extractTopicFromFilename(filename);
                ingestDocument(filename, topic, content, "Official Veterinary Compendium / Cobb-Ross Management Guide");
            }
        }
    }

    @Transactional
    public void ingestDocument(String docName, String topic, String content, String source) {
        Metadata metadata = new Metadata();
        metadata.put("doc_name", docName);
        metadata.put("topic", topic);
        metadata.put("source", source);
        metadata.put("species", "Broiler Chicken");

        Document doc = Document.from(content, metadata);

        // Split document into 400-char / ~100-token semantic chunks with 50-char overlap
        var splitter = DocumentSplitters.recursive(400, 50);
        List<TextSegment> segments = splitter.split(doc);

        if (segments.isEmpty()) {
            return;
        }

        for (TextSegment segment : segments) {
            Embedding embedding = embeddingModel.embed(segment).content();
            embeddingStore.add(embedding, segment);
        }

        // Record or update metadata in MySQL if table exists
        try {
            KnowledgeDocument entity = knowledgeDocumentRepository.findByDocName(docName)
                    .orElseGet(() -> KnowledgeDocument.builder()
                            .docName(docName)
                            .topic(topic)
                            .source(source)
                            .species("Broiler Chicken")
                            .build());

            entity.setChunkCount(segments.size());
            knowledgeDocumentRepository.save(entity);
        } catch (Exception e) {
            log.warn("Could not save knowledge document metadata to database for '{}': {}", docName, e.getMessage());
        }

        log.info("Ingested document '{}' (Topic: {}) -> {} chunks embedded.", docName, topic, segments.size());
    }

    public List<KnowledgeMatch> searchKnowledge(String query, int maxResults, double minScore) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        try {
            Embedding queryEmbedding = embeddingModel.embed(query).content();
            EmbeddingSearchRequest searchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(queryEmbedding)
                    .maxResults(maxResults)
                    .minScore(minScore)
                    .build();

            EmbeddingSearchResult<TextSegment> searchResult = embeddingStore.search(searchRequest);
            List<EmbeddingMatch<TextSegment>> matches = searchResult.matches();

            List<KnowledgeMatch> results = new ArrayList<>();
            for (EmbeddingMatch<TextSegment> m : matches) {
                TextSegment segment = m.embedded();
                Metadata meta = segment != null ? segment.metadata() : new Metadata();

                results.add(KnowledgeMatch.builder()
                        .text(segment != null ? segment.text() : "")
                        .score(m.score())
                        .source(meta.getString("source") != null ? meta.getString("source") : "Veterinary Compendium")
                        .topic(meta.getString("topic") != null ? meta.getString("topic") : "General Poultry Health")
                        .docName(meta.getString("doc_name") != null ? meta.getString("doc_name") : "")
                        .build());
            }

            return results;
        } catch (Exception e) {
            log.error("Error performing vector search for query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    private String extractTopicFromFilename(String filename) {
        if (filename.contains("respiratory")) return "Respiratory Health";
        if (filename.contains("enteric")) return "Enteric & Digestive Disorders";
        if (filename.contains("viral") || filename.contains("immunosuppressive")) return "Viral & Critical Pathologies";
        if (filename.contains("heat") || filename.contains("environmental")) return "Environmental & Heat Stress";
        if (filename.contains("growth") || filename.contains("fcr")) return "Broiler Growth & FCR Benchmarks";
        if (filename.contains("vaccin")) return "Vaccination Protocols";
        if (filename.contains("pharmacology") || filename.contains("safety")) return "Pharmacology & Medication Safety";
        return "General Poultry Management";
    }
}
