package com.st2i.cvfilter.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.st2i.cvfilter.dto.CandidateFilterRequest;
import com.st2i.cvfilter.dto.CandidateResponse;
import com.st2i.cvfilter.dto.DashboardStatsResponse;
import com.st2i.cvfilter.dto.SkillCountResponse;
import com.st2i.cvfilter.dto.SmartSearchRequest;
import com.st2i.cvfilter.dto.UploadCandidateResponse;
import com.st2i.cvfilter.exception.ResourceNotFoundException;
import com.st2i.cvfilter.model.Candidate;
import com.st2i.cvfilter.repository.CandidateRepository;
import com.st2i.cvfilter.service.CandidateScoringService.QuerySignals;

@Service
public class CandidateService {

    private static final int MAX_EMBED_TEXT_LENGTH = 600;

    private final CandidateRepository candidateRepository;
    private final CvTextExtractorService cvTextExtractorService;
    private final CandidateParserService candidateParserService;
    private final OllamaEmbeddingService ollamaEmbeddingService;
    private final CandidateScoringService candidateScoringService;
    private final AlfrescoService alfrescoService;

    public CandidateService(
            CandidateRepository candidateRepository,
            CvTextExtractorService cvTextExtractorService,
            CandidateParserService candidateParserService,
            OllamaEmbeddingService ollamaEmbeddingService,
            CandidateScoringService candidateScoringService,
            AlfrescoService alfrescoService
    ) {
        this.candidateRepository = candidateRepository;
        this.cvTextExtractorService = cvTextExtractorService;
        this.candidateParserService = candidateParserService;
        this.ollamaEmbeddingService = ollamaEmbeddingService;
        this.candidateScoringService = candidateScoringService;
        this.alfrescoService = alfrescoService;
    }

    public UploadCandidateResponse uploadCv(MultipartFile file) throws IOException {
        validateFile(file);

        String extractedText = cvTextExtractorService.extractText(file);

        Candidate candidate = candidateParserService.parse(
                file.getOriginalFilename(),
                file.getContentType(),
                extractedText
        );

        String alfrescoNodeId = alfrescoService.uploadFile(file);
        candidate.setAlfrescoNodeId(alfrescoNodeId);
        candidate.setCreatedAt(LocalDateTime.now());
        candidate.setEmbedding(ollamaEmbeddingService.createEmbedding(buildSearchableText(candidate)));

        Candidate saved = candidateRepository.save(candidate);
        saved.setAlfrescoFileUrl(cvDownloadUrl(saved.getId()));
        saved = candidateRepository.save(saved);

        UploadCandidateResponse response = new UploadCandidateResponse();
        response.setCandidateId(saved.getId());
        response.setFileName(saved.getCvFileName());
        response.setMessage("CV uploaded successfully");
        return response;
    }

    public List<CandidateResponse> getAllCandidates() {
        List<CandidateResponse> responses = new ArrayList<>();
        for (Candidate candidate : candidateRepository.findAll()) {
            responses.add(toResponse(candidate));
        }
        return responses;
    }

    public CandidateResponse getCandidateById(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        return toResponse(candidate);
    }

    public AlfrescoDocument downloadOriginalCv(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        if (candidate.getAlfrescoNodeId() == null || candidate.getAlfrescoNodeId().isBlank()) {
            throw new ResourceNotFoundException("Original CV document not found in Alfresco");
        }

        return alfrescoService.downloadFile(
                candidate.getAlfrescoNodeId(),
                candidate.getCvFileName(),
                candidate.getContentType()
        );
    }

    public CandidateResponse updateCandidate(String id, Candidate updated) {
        Candidate existing = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        existing.setFullName(updated.getFullName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        existing.setSkills(updated.getSkills());
        existing.setLanguages(updated.getLanguages());
        existing.setYearsOfExperience(updated.getYearsOfExperience());
        existing.setSeniorityLevel(updated.getSeniorityLevel());
        existing.setCurrentJobTitle(updated.getCurrentJobTitle());
        existing.setHighestDegree(updated.getHighestDegree());
        existing.setLinkedinUrl(updated.getLinkedinUrl());
        existing.setGithubUrl(updated.getGithubUrl());
        existing.setPortfolioUrl(updated.getPortfolioUrl());
        existing.setEducationEntries(updated.getEducationEntries());
        existing.setExperienceEntries(updated.getExperienceEntries());
        existing.setProjectEntries(updated.getProjectEntries());
        existing.setCertifications(updated.getCertifications());

        existing.setEmbedding(ollamaEmbeddingService.createEmbedding(buildSearchableText(existing)));

        Candidate saved = candidateRepository.save(existing);
        return toResponse(saved);
    }

    public void deleteCandidate(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        candidateRepository.delete(candidate);
    }

    public List<CandidateResponse> filterCandidates(CandidateFilterRequest request) {
        List<CandidateResponse> responses = new ArrayList<>();

        for (Candidate candidate : candidateRepository.findAll()) {

            if (request.getFullName() != null && !request.getFullName().isBlank()) {
                if (candidate.getFullName() == null ||
                        !candidate.getFullName().toLowerCase(Locale.ROOT)
                                .contains(request.getFullName().toLowerCase(Locale.ROOT))) {
                    continue;
                }
            }

            if (request.getSkill() != null && !request.getSkill().isBlank()) {
                if (candidate.getSkills() == null || candidate.getSkills().isEmpty()) {
                    continue;
                }

                boolean match = false;
                for (String skill : candidate.getSkills()) {
                    if (skill != null &&
                            skill.toLowerCase(Locale.ROOT).contains(request.getSkill().toLowerCase(Locale.ROOT))) {
                        match = true;
                        break;
                    }
                }

                if (!match) {
                    continue;
                }
            }

            if (request.getSeniorityLevel() != null && !request.getSeniorityLevel().isBlank()) {
                if (candidate.getSeniorityLevel() == null ||
                        !candidate.getSeniorityLevel().equalsIgnoreCase(request.getSeniorityLevel())) {
                    continue;
                }
            }

            if (request.getMinExperience() != null) {
                if (candidate.getYearsOfExperience() == null ||
                        candidate.getYearsOfExperience() < request.getMinExperience()) {
                    continue;
                }
            }

            if (request.getCurrentJobTitle() != null && !request.getCurrentJobTitle().isBlank()) {
                if (candidate.getCurrentJobTitle() == null ||
                        !candidate.getCurrentJobTitle().toLowerCase(Locale.ROOT)
                                .contains(request.getCurrentJobTitle().toLowerCase(Locale.ROOT))) {
                    continue;
                }
            }

            responses.add(toResponse(candidate));
        }

        return responses;
    }

    public List<CandidateResponse> smartSearch(SmartSearchRequest request) {
        if (request == null || request.getQuery() == null || request.getQuery().isBlank()) {
            return getAllCandidates();
        }

        String query = normalizeText(request.getQuery());
        QuerySignals signals = candidateScoringService.extractSignals(query);
        List<Candidate> candidates = candidateRepository.findAll().stream()
                .filter(candidate -> candidateScoringService.matchesRequiredSeniority(candidate, signals))
                .collect(Collectors.toList());

        if (candidates.isEmpty()) {
            return List.of();
        }

        List<Double> queryEmbedding = ollamaEmbeddingService.createEmbedding(query);

        if (queryEmbedding.isEmpty()) {
            return candidates.stream()
                    .map(this::toResponse)
                    .limit(10)
                    .collect(Collectors.toList());
        }

        for (Candidate candidate : candidates) {
            if (candidate.getEmbedding() == null || candidate.getEmbedding().isEmpty()) {
                candidate.setEmbedding(ollamaEmbeddingService.createEmbedding(buildSearchableText(candidate)));
                candidateRepository.save(candidate);
            }
        }

        List<ScoredCandidate> scoredCandidates = candidates.stream()
                .map(candidate -> {
                    double semanticSimilarity = cosineSimilarity(queryEmbedding, candidate.getEmbedding());
                    double semanticPercent = convertSimilarityToPercent(semanticSimilarity);
                    double structuredPercent = candidateScoringService.score(candidate, signals).getGlobalScore();

                    double rawScore = (semanticPercent * 0.35) + (structuredPercent * 0.65);

                    return new ScoredCandidate(candidate, rawScore);
                })
                .filter(candidate -> candidate.getRawScore() >= 45.0)
                .sorted(Comparator.comparingDouble(ScoredCandidate::getRawScore).reversed())
                .limit(10)
                .collect(Collectors.toList());

        return scoredCandidates.stream()
                .map(item -> {
                    CandidateResponse response = toResponse(item.getCandidate());
                    response.setAiMatchScore(roundScore(item.getRawScore()));
                    response.setScoreBreakdown(candidateScoringService.score(item.getCandidate(), signals));
                    return response;
                })
                .collect(Collectors.toList());
    }

    public DashboardStatsResponse getDashboardStats() {
        List<Candidate> candidates = candidateRepository.findAll();

        long total = candidates.size();
        long junior = candidates.stream()
                .filter(c -> "Junior".equalsIgnoreCase(c.getSeniorityLevel()))
                .count();
        long mid = candidates.stream()
                .filter(c -> "Mid".equalsIgnoreCase(c.getSeniorityLevel()))
                .count();
        long senior = candidates.stream()
                .filter(c -> "Senior".equalsIgnoreCase(c.getSeniorityLevel()))
                .count();

        Map<String, Long> skillCounts = new HashMap<>();
        for (Candidate candidate : candidates) {
            if (candidate.getSkills() == null) {
                continue;
            }

            for (String skill : candidate.getSkills()) {
                if (skill != null && !skill.isBlank()) {
                    skillCounts.put(skill, skillCounts.getOrDefault(skill, 0L) + 1);
                }
            }
        }

        List<SkillCountResponse> topSkills = skillCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> new SkillCountResponse(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());

        return new DashboardStatsResponse(total, junior, mid, senior, topSkills);
    }

    private CandidateResponse toResponse(Candidate candidate) {
        CandidateResponse response = new CandidateResponse();
        response.setId(candidate.getId());
        response.setFullName(candidate.getFullName());
        response.setEmail(candidate.getEmail());
        response.setPhone(candidate.getPhone());
        response.setAddress(candidate.getAddress());
        response.setSkills(candidate.getSkills());
        response.setLanguages(candidate.getLanguages());
        response.setYearsOfExperience(candidate.getYearsOfExperience());
        response.setSeniorityLevel(candidate.getSeniorityLevel());
        response.setCurrentJobTitle(candidate.getCurrentJobTitle());
        response.setHighestDegree(candidate.getHighestDegree());
        response.setLinkedinUrl(candidate.getLinkedinUrl());
        response.setGithubUrl(candidate.getGithubUrl());
        response.setPortfolioUrl(candidate.getPortfolioUrl());
        response.setEducationEntries(candidate.getEducationEntries());
        response.setExperienceEntries(candidate.getExperienceEntries());
        response.setProjectEntries(candidate.getProjectEntries());
        response.setCertifications(candidate.getCertifications());
        response.setCvFileName(candidate.getCvFileName());
        response.setAlfrescoNodeId(candidate.getAlfrescoNodeId());
        response.setAlfrescoFileUrl(candidate.getAlfrescoFileUrl() == null || candidate.getAlfrescoFileUrl().isBlank()
                ? cvDownloadUrl(candidate.getId())
                : candidate.getAlfrescoFileUrl());
        response.setCreatedAt(candidate.getCreatedAt());
        response.setAiMatchScore(null);
        response.setScoreBreakdown(null);
        return response;
    }

    private double convertSimilarityToPercent(double similarity) {
        double percent = ((similarity + 1.0) / 2.0) * 100.0;

        if (percent < 0.0) {
            return 0.0;
        }
        if (percent > 100.0) {
            return 100.0;
        }

        return percent;
    }

    private Double roundScore(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String cvDownloadUrl(String candidateId) {
        return candidateId == null ? null : "/api/hr/candidates/" + candidateId + "/cv/download";
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("Invalid file name");
        }

        String lower = fileName.toLowerCase(Locale.ROOT);
        if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
            throw new IllegalArgumentException("Only PDF and DOCX files are allowed");
        }
    }

    private String buildSearchableText(Candidate candidate) {
        StringBuilder builder = new StringBuilder();

        append(builder, candidate.getFullName());
        append(builder, candidate.getCurrentJobTitle());
        append(builder, candidate.getSeniorityLevel());
        append(builder, candidate.getHighestDegree());
        append(builder, candidate.getAddress());
        append(builder, candidate.getLinkedinUrl());
        append(builder, candidate.getGithubUrl());
        append(builder, candidate.getPortfolioUrl());

        if (candidate.getYearsOfExperience() != null) {
            append(builder, formatExperience(candidate.getYearsOfExperience()) + " experience");
        }

        if (candidate.getSkills() != null && !candidate.getSkills().isEmpty()) {
            append(builder, "Skills: " + String.join(", ", candidate.getSkills()));
        }

        if (candidate.getLanguages() != null && !candidate.getLanguages().isEmpty()) {
            append(builder, "Languages: " + String.join(", ", candidate.getLanguages()));
        }
        if (candidate.getEducationEntries() != null && !candidate.getEducationEntries().isEmpty()) {
            append(builder, "Education: " + String.join("; ", candidate.getEducationEntries()));
        }
        if (candidate.getExperienceEntries() != null && !candidate.getExperienceEntries().isEmpty()) {
            append(builder, "Experience: " + String.join("; ", candidate.getExperienceEntries()));
        }
        if (candidate.getProjectEntries() != null && !candidate.getProjectEntries().isEmpty()) {
            append(builder, "Projects: " + String.join("; ", candidate.getProjectEntries()));
        }
        if (candidate.getCertifications() != null && !candidate.getCertifications().isEmpty()) {
            append(builder, "Certifications: " + String.join("; ", candidate.getCertifications()));
        }

        append(builder, truncate(candidate.getExtractedText(), MAX_EMBED_TEXT_LENGTH));

        return normalizeText(builder.toString());
    }

    private void append(StringBuilder builder, String value) {
        if (value != null && !value.isBlank()) {
            builder.append(value).append("\n");
        }
    }

    private String formatExperience(Double value) {
        int totalMonths = (int) Math.max(0, Math.round(value * 12));
        int years = totalMonths / 12;
        int months = totalMonths % 12;
        List<String> parts = new ArrayList<>();

        if (years > 0) {
            parts.add(years + (years == 1 ? " year" : " years"));
        }
        if (months > 0) {
            parts.add(months + (months == 1 ? " month" : " months"));
        }

        return parts.isEmpty() ? "less than 1 month" : String.join(" ", parts);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return "";
        }

        String normalized = normalizeText(value);
        if (normalized.length() <= maxLength) {
            return normalized;
        }

        return normalized.substring(0, maxLength);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\s+", " ").trim();
    }

    private double cosineSimilarity(List<Double> a, List<Double> b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty() || a.size() != b.size()) {
            return 0.0;
        }

        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < a.size(); i++) {
            dot += a.get(i) * b.get(i);
            normA += a.get(i) * a.get(i);
            normB += b.get(i) * b.get(i);
        }

        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }

        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private static class ScoredCandidate {
        private final Candidate candidate;
        private final double rawScore;

        public ScoredCandidate(Candidate candidate, double rawScore) {
            this.candidate = candidate;
            this.rawScore = rawScore;
        }

        public Candidate getCandidate() {
            return candidate;
        }

        public double getRawScore() {
            return rawScore;
        }
    }
}
