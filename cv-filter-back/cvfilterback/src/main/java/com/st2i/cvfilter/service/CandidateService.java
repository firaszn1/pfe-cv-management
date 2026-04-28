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
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.st2i.cvfilter.dto.CandidateFilterRequest;
import com.st2i.cvfilter.dto.CandidatePageResponse;
import com.st2i.cvfilter.dto.CandidateResponse;
import com.st2i.cvfilter.dto.DashboardStatsResponse;
import com.st2i.cvfilter.dto.ScoreBreakdownResponse;
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
    private static final long MAX_UPLOAD_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[0-9][0-9\\s\\-()]{6,20}$");

    private final CandidateRepository candidateRepository;
    private final CvTextExtractorService cvTextExtractorService;
    private final CandidateParserService candidateParserService;
    private final OllamaEmbeddingService ollamaEmbeddingService;
    private final CandidateScoringService candidateScoringService;
    private final AlfrescoService alfrescoService;
    private final AuditLogService auditLogService;

    public CandidateService(
            CandidateRepository candidateRepository,
            CvTextExtractorService cvTextExtractorService,
            CandidateParserService candidateParserService,
            OllamaEmbeddingService ollamaEmbeddingService,
            CandidateScoringService candidateScoringService,
            AlfrescoService alfrescoService,
            AuditLogService auditLogService
    ) {
        this.candidateRepository = candidateRepository;
        this.cvTextExtractorService = cvTextExtractorService;
        this.candidateParserService = candidateParserService;
        this.ollamaEmbeddingService = ollamaEmbeddingService;
        this.candidateScoringService = candidateScoringService;
        this.alfrescoService = alfrescoService;
        this.auditLogService = auditLogService;
    }

    public UploadCandidateResponse uploadCv(MultipartFile file) throws IOException {
        validateFile(file);

        String extractedText = cvTextExtractorService.extractText(file);

        Candidate candidate = candidateParserService.parse(
                file.getOriginalFilename(),
                file.getContentType(),
                extractedText
        );
        candidate.setParsingWarnings(buildParsingWarnings(candidate));
        candidate.setStatus(candidate.getParsingWarnings().isEmpty() ? "NEW" : "NEEDS_REVIEW");

        String alfrescoNodeId = alfrescoService.uploadFile(file);
        candidate.setAlfrescoNodeId(alfrescoNodeId);
        candidate.setCreatedAt(LocalDateTime.now());
        candidate.setEmbedding(ollamaEmbeddingService.createEmbedding(buildSearchableText(candidate)));

        Candidate saved = candidateRepository.save(candidate);
        saved.setAlfrescoFileUrl(cvDownloadUrl(saved.getId()));
        saved = candidateRepository.save(saved);
        auditLogService.log("CV_UPLOADED", "CANDIDATE", saved.getId(), saved.getFullName(), saved.getCvFileName());

        UploadCandidateResponse response = new UploadCandidateResponse();
        response.setCandidateId(saved.getId());
        response.setFileName(saved.getCvFileName());
        String duplicateWarning = duplicateWarning(candidate, saved.getId());
        response.setMessage(duplicateWarning == null
                ? "CV uploaded successfully"
                : "CV uploaded successfully. " + duplicateWarning);
        return response;
    }

    public List<CandidateResponse> getAllCandidates() {
        List<CandidateResponse> responses = new ArrayList<>();
        for (Candidate candidate : candidateRepository.findAll()) {
            responses.add(toResponse(candidate));
        }
        return responses;
    }

    public CandidatePageResponse getCandidatesPage(Integer page, Integer size, String sort) {
        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = size == null || size <= 0 ? 10 : Math.min(size, 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, parseSort(sort));
        Page<Candidate> candidatePage = candidateRepository.findAll(pageable);

        if (candidatePage.getTotalPages() > 0 && safePage >= candidatePage.getTotalPages()) {
            pageable = PageRequest.of(candidatePage.getTotalPages() - 1, safeSize, parseSort(sort));
            candidatePage = candidateRepository.findAll(pageable);
        }

        List<CandidateResponse> content = candidatePage.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return new CandidatePageResponse(
                content,
                candidatePage.getTotalElements(),
                candidatePage.getTotalPages(),
                candidatePage.getNumber()
        );
    }

    public CandidateResponse getCandidateById(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        return toResponse(candidate);
    }

    public AlfrescoDocument downloadOriginalCv(String id, String action) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        if (candidate.getAlfrescoNodeId() == null || candidate.getAlfrescoNodeId().isBlank()) {
            throw new ResourceNotFoundException("Original CV document not found in Alfresco");
        }

        AlfrescoDocument document = alfrescoService.downloadFile(
                candidate.getAlfrescoNodeId(),
                candidate.getCvFileName(),
                candidate.getContentType()
        );
        auditLogService.log(action, "CANDIDATE", candidate.getId(), candidate.getFullName(), candidate.getCvFileName());
        return document;
    }

    public CandidateResponse updateCandidate(String id, Candidate updated) {
        Candidate existing = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        validateCandidateData(updated, id);

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
        existing.setParsingWarnings(buildParsingWarnings(existing));
        if (!existing.getParsingWarnings().isEmpty()) {
            existing.setStatus("NEEDS_REVIEW");
        }

        existing.setEmbedding(ollamaEmbeddingService.createEmbedding(buildSearchableText(existing)));

        Candidate saved = candidateRepository.save(existing);
        auditLogService.log("CANDIDATE_EDITED", "CANDIDATE", saved.getId(), saved.getFullName(), "Candidate profile updated");
        return toResponse(saved);
    }

    public void deleteCandidate(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        boolean alfrescoDeleted = alfrescoService.deleteFile(candidate.getAlfrescoNodeId());
        candidateRepository.delete(candidate);
        auditLogService.log("CANDIDATE_DELETED", "CANDIDATE", candidate.getId(), candidate.getFullName(), "Candidate deleted");
        if (!alfrescoDeleted) {
            auditLogService.log("ALFRESCO_DELETE_FAILED", "CANDIDATE", candidate.getId(), candidate.getFullName(),
                    "Candidate deleted from MongoDB, but Alfresco node cleanup failed: " + candidate.getAlfrescoNodeId());
        }
    }

    public CandidateResponse updateStatus(String id, String status) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        String normalizedStatus = normalizeStatus(status);
        candidate.setParsingWarnings(buildParsingWarnings(candidate));
        if (!candidate.getParsingWarnings().isEmpty()) {
            normalizedStatus = "NEEDS_REVIEW";
        }
        String previousStatus = candidate.getStatus();
        candidate.setStatus(normalizedStatus);
        Candidate saved = candidateRepository.save(candidate);
        auditLogService.log("CANDIDATE_STATUS_CHANGED", "CANDIDATE", saved.getId(), saved.getFullName(),
                "Status changed from " + valueOrUnknown(previousStatus) + " to " + normalizedStatus);
        return toResponse(saved);
    }

    public CandidateResponse toggleShortlist(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        boolean nextValue = candidate.getShortlisted() == null || !candidate.getShortlisted();
        candidate.setShortlisted(nextValue);
        Candidate saved = candidateRepository.save(candidate);
        auditLogService.log(nextValue ? "CANDIDATE_SHORTLISTED" : "CANDIDATE_UNSHORTLISTED",
                "CANDIDATE", saved.getId(), saved.getFullName(), "Shortlisted: " + nextValue);
        return toResponse(saved);
    }

    public List<CandidateResponse> getShortlistedCandidates() {
        return candidateRepository.findByShortlistedTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
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

            if (request.getStatus() != null && !request.getStatus().isBlank()) {
                if (candidate.getStatus() == null ||
                        !candidate.getStatus().equalsIgnoreCase(request.getStatus())) {
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
        if (query.length() > 2000) {
            throw new IllegalArgumentException("Search query is too long. Maximum allowed length is 2000 characters.");
        }
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
                    .map(candidate -> {
                        ScoreBreakdownResponse breakdown = candidateScoringService.score(candidate, signals);
                        CandidateResponse response = toResponse(candidate);
                        response.setAiMatchScore(breakdown.getGlobalScore());
                        response.setScoreBreakdown(breakdown);
                        return response;
                    })
                    .sorted(Comparator.comparing(
                            CandidateResponse::getAiMatchScore,
                            Comparator.nullsLast(Comparator.reverseOrder())
                    ))
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

    public int regenerateMissingEmbeddings() {
        int updated = 0;
        for (Candidate candidate : candidateRepository.findAll()) {
            if (candidate.getEmbedding() != null && !candidate.getEmbedding().isEmpty()) {
                continue;
            }

            List<Double> embedding = ollamaEmbeddingService.createEmbedding(buildSearchableText(candidate));
            if (embedding.isEmpty()) {
                continue;
            }

            candidate.setEmbedding(embedding);
            candidateRepository.save(candidate);
            updated++;
        }
        auditLogService.log("EMBEDDINGS_REGENERATED", "AI", null, "Candidate embeddings",
                "Regenerated missing embeddings for " + updated + " candidates");
        return updated;
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
        response.setStatus(candidate.getStatus() == null || candidate.getStatus().isBlank() ? "NEW" : candidate.getStatus());
        response.setShortlisted(Boolean.TRUE.equals(candidate.getShortlisted()));
        response.setParsingWarnings(buildParsingWarnings(candidate));
        return response;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Candidate status is required");
        }

        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!List.of("NEEDS_REVIEW", "NEW", "REVIEWED", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED").contains(normalized)) {
            throw new IllegalArgumentException("Unsupported candidate status: " + status);
        }
        return normalized;
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "UNKNOWN" : value;
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        String[] parts = sort.split(",");
        String property = parts[0] == null ? "" : parts[0].trim();
        if (property.isBlank()) {
            return Sort.unsorted();
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim())) {
            direction = Sort.Direction.DESC;
        }
        return Sort.by(direction, property);
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
        if (file.getSize() > MAX_UPLOAD_SIZE_BYTES) {
            throw new IllegalArgumentException("Uploaded file is too large. Maximum allowed size is 10MB.");
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

    private void validateCandidateData(Candidate candidate, String currentCandidateId) {
        if (candidate.getEmail() != null && !candidate.getEmail().isBlank()
                && !EMAIL_PATTERN.matcher(candidate.getEmail().trim()).matches()) {
            throw new IllegalArgumentException("Invalid email format");
        }

        if (candidate.getPhone() != null && !candidate.getPhone().isBlank()
                && !PHONE_PATTERN.matcher(candidate.getPhone().trim()).matches()) {
            throw new IllegalArgumentException("Invalid phone format");
        }

        String duplicateWarning = duplicateWarning(candidate, currentCandidateId);
        if (duplicateWarning != null) {
            throw new IllegalArgumentException(duplicateWarning);
        }
    }

    private String duplicateWarning(Candidate candidate, String currentCandidateId) {
        for (Candidate existing : candidateRepository.findAll()) {
            if (existing.getId() != null && existing.getId().equals(currentCandidateId)) {
                continue;
            }

            if (candidate.getEmail() != null && existing.getEmail() != null
                    && candidate.getEmail().equalsIgnoreCase(existing.getEmail())) {
                return "A candidate with the same email already exists: " + existing.getFullName();
            }

            if (isSimilarName(candidate.getFullName(), existing.getFullName())) {
                return "A candidate with a very similar name already exists: " + existing.getFullName();
            }
        }
        return null;
    }

    private boolean isSimilarName(String first, String second) {
        String a = normalizeText(first).toLowerCase(Locale.ROOT);
        String b = normalizeText(second).toLowerCase(Locale.ROOT);
        if (a.length() < 5 || b.length() < 5 || "unknown".equals(a) || "unknown".equals(b)) {
            return false;
        }
        return a.equals(b) || a.contains(b) || b.contains(a);
    }

    private boolean hasCriticalMissingFields(Candidate candidate) {
        return !buildParsingWarnings(candidate).isEmpty();
    }

    private List<String> buildParsingWarnings(Candidate candidate) {
        List<String> warnings = new ArrayList<>();
        if (isBlankOrUnknown(candidate.getFullName())) {
            warnings.add("Missing full name");
        }
        if (isBlankOrUnknown(candidate.getEmail())) {
            warnings.add("Missing email");
        }
        if (isBlankOrUnknown(candidate.getCurrentJobTitle())) {
            warnings.add("Missing current job title");
        }
        if (candidate.getSkills() == null || candidate.getSkills().isEmpty()) {
            warnings.add("Missing skills");
        }
        return warnings;
    }

    private boolean isBlankOrUnknown(String value) {
        return value == null || value.isBlank() || "unknown".equalsIgnoreCase(value.trim());
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
