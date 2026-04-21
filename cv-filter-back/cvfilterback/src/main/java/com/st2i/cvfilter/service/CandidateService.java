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

@Service
public class CandidateService {

    private static final int MAX_EMBED_TEXT_LENGTH = 600;

    private final CandidateRepository candidateRepository;
    private final CvTextExtractorService cvTextExtractorService;
    private final CandidateParserService candidateParserService;
    private final OllamaEmbeddingService ollamaEmbeddingService;

    public CandidateService(
            CandidateRepository candidateRepository,
            CvTextExtractorService cvTextExtractorService,
            CandidateParserService candidateParserService,
            OllamaEmbeddingService ollamaEmbeddingService
    ) {
        this.candidateRepository = candidateRepository;
        this.cvTextExtractorService = cvTextExtractorService;
        this.candidateParserService = candidateParserService;
        this.ollamaEmbeddingService = ollamaEmbeddingService;
    }

    public UploadCandidateResponse uploadCv(MultipartFile file) throws IOException {
        validateFile(file);

        String extractedText = cvTextExtractorService.extractText(file);

        Candidate candidate = candidateParserService.parse(
                file.getOriginalFilename(),
                file.getContentType(),
                extractedText
        );

        candidate.setCreatedAt(LocalDateTime.now());
        candidate.setEmbedding(ollamaEmbeddingService.createEmbedding(buildSearchableText(candidate)));

        Candidate saved = candidateRepository.save(candidate);

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
        List<Double> queryEmbedding = ollamaEmbeddingService.createEmbedding(query);

        if (queryEmbedding.isEmpty()) {
            return getAllCandidates();
        }

        QuerySignals signals = extractQuerySignals(query);
        List<Candidate> candidates = candidateRepository.findAll();

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
                    double bonusPercent = computeHybridBonus(candidate, signals);

                    // Honest score:
                    // semantic gives the base relevance
                    // bonus rewards exact HR-relevant matches
                    double rawScore = (semanticPercent * 0.60) + (bonusPercent * 0.40);

                    // Penalize weak/no-signal matches so system stops "lying"
                    if (bonusPercent < 15.0) {
                        rawScore *= 0.65;
                    } else if (bonusPercent < 30.0) {
                        rawScore *= 0.80;
                    }

                    return new ScoredCandidate(candidate, rawScore);
                })
                .sorted(Comparator.comparingDouble(ScoredCandidate::getRawScore).reversed())
                .limit(10)
                .collect(Collectors.toList());

        return scoredCandidates.stream()
                .map(item -> {
                    CandidateResponse response = toResponse(item.getCandidate());
                    response.setAiMatchScore(roundScore(item.getRawScore()));
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
        response.setCvFileName(candidate.getCvFileName());
        response.setCreatedAt(candidate.getCreatedAt());
        response.setAiMatchScore(null);
        return response;
    }

    private QuerySignals extractQuerySignals(String query) {
        String q = query.toLowerCase(Locale.ROOT);
        QuerySignals signals = new QuerySignals();

        if (q.contains("junior")) {
            signals.seniority = "Junior";
        } else if (q.contains("mid")) {
            signals.seniority = "Mid";
        } else if (q.contains("senior")) {
            signals.seniority = "Senior";
        }

        String[] knownSkills = {
                "java", "react", "angular", "spring boot", "spring", "node", "node.js",
                "mysql", "sql", "python", "javascript", "typescript", "html", "css", "javafx"
        };

        for (String skill : knownSkills) {
            if (q.contains(skill)) {
                signals.skills.add(skill);
            }
        }

        String[] knownTitles = {
                "frontend developer",
                "backend developer",
                "fullstack developer",
                "full stack developer",
                "developer",
                "engineer",
                "intern",
                "student",
                "react specialist",
                "web software engineer",
                "frontend",
                "backend"
        };

        for (String title : knownTitles) {
            if (q.contains(title)) {
                signals.jobTitles.add(title);
            }
        }

        return signals;
    }

    private double computeHybridBonus(Candidate candidate, QuerySignals signals) {
        double bonus = 0.0;

        if (signals.seniority != null &&
                candidate.getSeniorityLevel() != null &&
                candidate.getSeniorityLevel().equalsIgnoreCase(signals.seniority)) {
            bonus += 35.0;
        }

        if (candidate.getSkills() != null) {
            for (String querySkill : signals.skills) {
                for (String candidateSkill : candidate.getSkills()) {
                    if (candidateSkill != null &&
                            candidateSkill.toLowerCase(Locale.ROOT)
                                    .contains(querySkill.toLowerCase(Locale.ROOT))) {
                        bonus += 20.0;
                        break;
                    }
                }
            }
        }

        if (candidate.getCurrentJobTitle() != null) {
            String candidateTitle = candidate.getCurrentJobTitle().toLowerCase(Locale.ROOT);
            for (String queryTitle : signals.jobTitles) {
                if (candidateTitle.contains(queryTitle.toLowerCase(Locale.ROOT))) {
                    bonus += 28.0;
                    break;
                }
            }
        }

        if (signals.seniority != null && candidate.getYearsOfExperience() != null) {
            if ("Senior".equalsIgnoreCase(signals.seniority) && candidate.getYearsOfExperience() >= 5.0) {
                bonus += 12.0;
            } else if ("Mid".equalsIgnoreCase(signals.seniority)
                    && candidate.getYearsOfExperience() >= 2.0
                    && candidate.getYearsOfExperience() < 5.0) {
                bonus += 8.0;
            } else if ("Junior".equalsIgnoreCase(signals.seniority)
                    && candidate.getYearsOfExperience() < 2.0) {
                bonus += 8.0;
            }
        }

        if (bonus > 100.0) {
            bonus = 100.0;
        }

        return bonus;
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

        if (candidate.getYearsOfExperience() != null) {
            append(builder, candidate.getYearsOfExperience() + " years experience");
        }

        if (candidate.getSkills() != null && !candidate.getSkills().isEmpty()) {
            append(builder, "Skills: " + String.join(", ", candidate.getSkills()));
        }

        if (candidate.getLanguages() != null && !candidate.getLanguages().isEmpty()) {
            append(builder, "Languages: " + String.join(", ", candidate.getLanguages()));
        }

        append(builder, truncate(candidate.getExtractedText(), MAX_EMBED_TEXT_LENGTH));

        return normalizeText(builder.toString());
    }

    private void append(StringBuilder builder, String value) {
        if (value != null && !value.isBlank()) {
            builder.append(value).append("\n");
        }
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

    private static class QuerySignals {
        private String seniority;
        private final List<String> skills = new ArrayList<>();
        private final List<String> jobTitles = new ArrayList<>();
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