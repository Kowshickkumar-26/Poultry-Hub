package com.poultry.poultrymanagement.service.ai;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

/**
 * Resilient Embedding Model adapter that delegates to a remote embedding API (e.g. OpenAI text-embedding-3-small,
 * Gemini text-embedding-004, or compatible endpoint).
 *
 * If the remote provider is unavailable, unconfigured, or throttled, it seamlessly falls back to
 * a zero-memory, deterministic lexical feature embedding algorithm using the exact same dimension (default: 384).
 * This eliminates the JVM heap OutOfMemoryError caused by in-process ONNX neural models on 512MB RAM containers.
 */
@Slf4j
public class ResilientEmbeddingModel implements EmbeddingModel {

    private final EmbeddingModel remoteModel;
    private final int dimension;
    private final boolean hasRemote;

    public ResilientEmbeddingModel(EmbeddingModel remoteModel, int dimension) {
        this.remoteModel = remoteModel;
        this.dimension = dimension > 0 ? dimension : 384;
        this.hasRemote = remoteModel != null;
    }

    @Override
    public Response<List<Embedding>> embedAll(List<TextSegment> textSegments) {
        if (textSegments == null || textSegments.isEmpty()) {
            return Response.from(List.of());
        }

        if (hasRemote) {
            try {
                return remoteModel.embedAll(textSegments);
            } catch (Exception e) {
                log.warn("⚠️ Remote embedding service error ({}). Engaging zero-memory lexical feature embedding fallback.", e.getMessage());
            }
        }

        List<Embedding> fallbackList = new ArrayList<>(textSegments.size());
        for (TextSegment segment : textSegments) {
            fallbackList.add(generateLexicalEmbedding(segment != null ? segment.text() : ""));
        }
        return Response.from(fallbackList);
    }

    @Override
    public int dimension() {
        return dimension;
    }

    /**
     * Computes a deterministic, L2-normalized feature-hashed vector of the configured dimension.
     * Memory overhead is zero (no ONNX runtime, no model weights in heap).
     */
    public Embedding generateLexicalEmbedding(String text) {
        float[] vector = new float[dimension];
        if (text == null || text.isBlank()) {
            return new Embedding(vector);
        }

        // Tokenize into lowercase alphanumeric words
        String[] tokens = text.toLowerCase().split("[^a-zA-Z0-9]+");
        float normSq = 0.0f;
        for (String token : tokens) {
            if (token.isEmpty() || token.length() < 2) continue;
            int hash = Math.abs(token.hashCode()) % dimension;
            vector[hash] += 1.0f;
        }

        // Add bigrams for local multi-word context (e.g. "heat stress", "feed intake")
        for (int i = 0; i < tokens.length - 1; i++) {
            if (tokens[i].isEmpty() || tokens[i + 1].isEmpty()) continue;
            String bigram = tokens[i] + "_" + tokens[i + 1];
            int hash = Math.abs(bigram.hashCode()) % dimension;
            vector[hash] += 0.5f;
        }

        for (float v : vector) {
            normSq += v * v;
        }

        if (normSq > 0.0f) {
            float invNorm = (float) (1.0 / Math.sqrt(normSq));
            for (int i = 0; i < dimension; i++) {
                vector[i] *= invNorm;
            }
        }

        return new Embedding(vector);
    }
}
