package com.st2i.cvfilter.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OllamaEmbeddingService {

    private final String baseUrl;
    private final String embeddingModel;
    private final RestClient restClient;

    public OllamaEmbeddingService(
            @Value("${ollama.base-url}") String baseUrl,
            @Value("${ollama.embedding-model}") String embeddingModel
    ) {
        this.baseUrl = baseUrl;
        this.embeddingModel = embeddingModel;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public List<Double> createEmbedding(String input) {
        if (input == null || input.isBlank()) {
            return new ArrayList<>();
        }

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", embeddingModel);
        requestBody.put("input", input);

        Map<String, Object> response;
        try {
            response = restClient.post()
                    .uri("/api/embed")
                    .body(requestBody)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (RuntimeException ex) {
            return new ArrayList<>();
        }

        if (response == null || !response.containsKey("embeddings")) {
            return new ArrayList<>();
        }

        Object embeddingsObject = response.get("embeddings");
        if (!(embeddingsObject instanceof List<?> embeddingsList) || embeddingsList.isEmpty()) {
            return new ArrayList<>();
        }

        Object firstEmbedding = embeddingsList.get(0);
        if (!(firstEmbedding instanceof List<?> vectorList)) {
            return new ArrayList<>();
        }

        List<Double> result = new ArrayList<>();
        for (Object value : vectorList) {
            if (value instanceof Number number) {
                result.add(number.doubleValue());
            }
        }

        return result;
    }
}
