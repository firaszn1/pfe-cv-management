package com.st2i.cvfilter.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.st2i.cvfilter.dto.CandidateResponse;
import com.st2i.cvfilter.dto.CandidateCompareRequest;
import com.st2i.cvfilter.dto.CandidateCompareResponse;
import com.st2i.cvfilter.dto.ChatCandidateResponse;
import com.st2i.cvfilter.dto.ChatRequest;
import com.st2i.cvfilter.dto.ChatResponse;
import com.st2i.cvfilter.dto.InterviewKitResponse;
import com.st2i.cvfilter.dto.JobMatchRequest;
import com.st2i.cvfilter.dto.JobMatchResponse;
import com.st2i.cvfilter.dto.SmartSearchRequest;

@Service
public class ChatService {

    private static final int RESULT_LIMIT = 5;

    private static final Set<String> KNOWN_SKILLS = Set.of(
            // JVM / Backend
            "java", "spring boot", "spring", "spring security", "spring cloud",
            "hibernate", "jpa", "maven", "gradle", "junit", "javafx", "kotlin",
            // Frontend
            "react", "angular", "vue", "svelte", "javascript", "typescript",
            "html", "css", "tailwind", "bootstrap", "sass", "nextjs", "next.js",
            // Mobile
            "flutter", "dart", "swift", "react native", "android", "ios",
            // Scripting / ML
            "python", "django", "flask", "fastapi", "pytest",
            "tensorflow", "pytorch", "scikit", "pandas", "numpy", "jupyter",
            "machine learning", "deep learning",
            // PHP ecosystem
            "php", "laravel", "symfony",
            // Node ecosystem
            "node", "node.js", "express",
            // .NET
            "c#", ".net",
            // Systems
            "c++", "rust", "golang", "go",
            // Databases
            "mysql", "sql", "postgresql", "postgres", "mongodb", "oracle",
            "redis", "elasticsearch",
            // Messaging / Streaming
            "kafka", "rabbitmq", "spark", "hadoop",
            // DevOps / Cloud
            "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins",
            "aws", "azure", "gcp", "devops", "linux",
            // API / Architecture
            "rest", "api", "graphql", "grpc", "microservices",
            // Tools / Data
            "git", "power bi", "excel", "data"
    );

    private static final Set<String> ROLE_TERMS = Set.of(
            "frontend", "front end", "front-end",
            "backend", "back end", "back-end",
            "fullstack", "full stack", "full-stack",
            "developer", "engineer", "intern", "student",
            "devops", "architect", "lead", "manager", "analyst",
            "scientist", "mobile", "data", "cloud", "security",
            "qa", "tester", "consultant"
    );

    private final CandidateService candidateService;
    private final JobMatchService jobMatchService;
    private final CandidateCompareService candidateCompareService;
    private final InterviewKitService interviewKitService;
    private final Map<String, ConversationState> conversations = new ConcurrentHashMap<>();

    public ChatService(CandidateService candidateService,
                       JobMatchService jobMatchService,
                       CandidateCompareService candidateCompareService,
                       InterviewKitService interviewKitService) {
        this.candidateService = candidateService;
        this.jobMatchService = jobMatchService;
        this.candidateCompareService = candidateCompareService;
        this.interviewKitService = interviewKitService;
    }

    public ChatResponse reply(ChatRequest request) {
        String conversationId = normalizeConversationId(request == null ? null : request.getConversationId());
        ConversationState state = conversations.computeIfAbsent(conversationId, ignored -> new ConversationState());
        String message = request == null ? "" : trimToEmpty(request.getMessage());

        if (message.isBlank()) {
            return simpleResponse(conversationId, "general",
                    "Tell me what profile you need — for example: \"Find a senior Spring Boot developer\" or \"Who matches this backend role?\"",
                    List.of("find_senior_java", "find_junior_frontend", "compare_profiles"));
        }

        Intent intent = detectIntent(message, state);

        return switch (intent) {
            case SUMMARY        -> summarizeCandidate(conversationId, state, request, message);
            case COMPARISON     -> compareCandidates(conversationId, state, message);
            case JOB_MATCH      -> matchJobDescription(conversationId, state, message);
            case INTERVIEW_KIT  -> generateInterviewKit(conversationId, state, request, message);
            default             -> searchCandidates(conversationId, state, message, intent == Intent.FOLLOW_UP);
        };
    }

    // ─── INTENT HANDLERS ─────────────────────────────────────────────────────

    private ChatResponse matchJobDescription(String conversationId, ConversationState state, String message) {
        JobMatchRequest jmRequest = new JobMatchRequest();
        jmRequest.setDescription(message);
        JobMatchResponse match;
        try {
            match = jobMatchService.match(jmRequest);
        } catch (Exception e) {
            return simpleResponse(conversationId, "job_match",
                    "Job description analysis failed. Please check the AI service and try again.",
                    List.of());
        }

        List<CandidateResponse> candidates = match.getCandidates().stream()
                .limit(RESULT_LIMIT).collect(Collectors.toList());

        state.lastQuery = message;
        state.lastResults = candidates;
        if (!candidates.isEmpty()) state.selectedCandidateId = candidates.get(0).getId();

        QuerySignals signals = extractSignals(message);
        List<ChatCandidateResponse> enriched = candidates.stream()
                .map(c -> enrichCandidate(c, signals))
                .collect(Collectors.toList());

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent("job_match");
        response.setCandidates(enriched);
        if (!enriched.isEmpty()) response.setTopCandidate(enriched.get(0));

        String skillsSummary = match.getExtractedSkills() != null && !match.getExtractedSkills().isEmpty()
                ? String.join(", ", match.getExtractedSkills().stream().limit(6).collect(Collectors.toList()))
                : String.join(", ", match.getKeywords().stream().limit(6).collect(Collectors.toList()));

        response.setMessage(enriched.isEmpty()
                ? "No candidates matched this job description strongly enough. Try uploading more CVs."
                : enriched.size() + " candidate" + (enriched.size() > 1 ? "s" : "") + " matched. Best fit: "
                        + enriched.get(0).getCandidate().getFullName()
                        + scoreText(enriched.get(0).getCandidate()) + ".");
        response.setExplanation("Detected seniority: " + valueOrUnknown(match.getSeniority())
                + ". Required skills: " + valueOrUnknown(skillsSummary) + ".");
        response.setSuggestedActions(List.of("compare_top", "shortlist_top", "interview_kit"));
        return response;
    }

    private ChatResponse searchCandidates(String conversationId, ConversationState state, String message, boolean followUp) {
        String searchQuery = followUp && state.lastQuery != null
                ? mergeFollowUp(state.lastQuery, message) : message;

        QuerySignals signals = extractSignals(searchQuery);
        QuerySignals messageSignals = extractSignals(message);

        List<CandidateResponse> candidates;
        try {
            candidates = (followUp && state.lastResults != null && !state.lastResults.isEmpty())
                    ? state.lastResults
                    : candidateService.smartSearch(new SmartSearchRequest(searchQuery));
        } catch (Exception e) {
            candidates = new ArrayList<>();
        }

        List<CandidateResponse> filtered = applyFollowUpFilters(candidates, messageSignals, followUp)
                .stream().limit(RESULT_LIMIT).collect(Collectors.toList());

        if (filtered.isEmpty() && followUp) {
            try {
                candidates = candidateService.smartSearch(new SmartSearchRequest(searchQuery));
                filtered = applyFollowUpFilters(candidates, messageSignals, true)
                        .stream().limit(RESULT_LIMIT).collect(Collectors.toList());
            } catch (Exception ignored) {}
        }

        state.lastQuery = searchQuery;
        state.lastResults = filtered;
        if (!filtered.isEmpty()) state.selectedCandidateId = filtered.get(0).getId();

        List<ChatCandidateResponse> enriched = filtered.stream()
                .map(c -> enrichCandidate(c, signals))
                .collect(Collectors.toList());

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent(followUp ? "follow_up_search" : "search");
        response.setCandidates(enriched);

        if (enriched.isEmpty()) {
            response.setMessage("No strong matches found for that request.");
            response.setExplanation("Try specifying a skill (Java, React, Docker), seniority (Junior, Senior), or role (Backend, Frontend, Intern).");
            response.setSuggestedActions(List.of("find_senior_java", "find_junior_frontend", "upload_cv"));
            return response;
        }

        ChatCandidateResponse top = enriched.get(0);
        response.setTopCandidate(top);
        response.setMessage(enriched.size() + " candidate" + (enriched.size() > 1 ? "s" : "") + " found. Top match: "
                + top.getCandidate().getFullName() + scoreText(top.getCandidate()) + ".");
        response.setExplanation(top.getExplanation());
        response.setSuggestedActions(List.of("compare_top", "shortlist_top", "interview_kit", "summarize_top"));
        return response;
    }

    private ChatResponse summarizeCandidate(String conversationId, ConversationState state, ChatRequest request, String message) {
        CandidateResponse candidate = resolveCandidate(state, request, message);
        if (candidate == null) {
            return simpleResponse(conversationId, "summary",
                    "I need a candidate first. Select one from search results or mention their name.",
                    List.of("find_candidate"));
        }

        state.selectedCandidateId = candidate.getId();
        QuerySignals signals = extractSignals(state.lastQuery == null ? message : state.lastQuery);
        ChatCandidateResponse summary = enrichCandidate(candidate, signals);

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent("summary");
        response.setTopCandidate(summary);
        response.setCandidates(List.of(summary));
        response.setMessage("Profile summary for " + candidate.getFullName() + ".");
        response.setExplanation(summaryText(candidate, summary));
        response.setSuggestedActions(List.of("shortlist", "interview_kit", "open_profile"));
        return response;
    }

    private ChatResponse compareCandidates(String conversationId, ConversationState state, String message) {
        List<CandidateResponse> results = state.lastResults == null ? List.of() : state.lastResults;
        if (results.size() < 2) {
            return simpleResponse(conversationId, "comparison",
                    "I need at least two candidates to compare. Try searching first, then ask me to compare.",
                    List.of("find_backend", "find_java"));
        }

        List<CandidateResponse> topTwo = results.stream()
                .sorted(Comparator.comparing(
                        c -> c.getAiMatchScore() == null ? 0.0 : c.getAiMatchScore(),
                        Comparator.reverseOrder()))
                .limit(2).collect(Collectors.toList());

        CandidateCompareRequest compareReq = new CandidateCompareRequest();
        compareReq.setCandidateIds(topTwo.stream().map(CandidateResponse::getId).collect(Collectors.toList()));

        CandidateCompareResponse comparison;
        try {
            comparison = candidateCompareService.compare(compareReq);
        } catch (Exception e) {
            return simpleResponse(conversationId, "comparison",
                    "Comparison failed. Please try again.",
                    List.of());
        }

        QuerySignals signals = extractSignals(state.lastQuery == null ? message : state.lastQuery);
        List<ChatCandidateResponse> enriched = comparison.getCandidates().stream()
                .map(c -> enrichCandidate(c, signals))
                .collect(Collectors.toList());

        if (enriched.size() < 2) {
            return simpleResponse(conversationId, "comparison",
                    "Could not retrieve enough candidate data for comparison.",
                    List.of());
        }

        CandidateResponse winner = enriched.get(0).getCandidate();
        CandidateResponse runner = enriched.get(1).getCandidate();

        double scoreDiff = (winner.getAiMatchScore() != null && runner.getAiMatchScore() != null)
                ? winner.getAiMatchScore() - runner.getAiMatchScore() : 0;
        String scoreAdvantage = scoreDiff > 0
                ? winner.getFullName() + " leads by " + Math.round(scoreDiff) + "% on AI score. " : "";
        String sharedSkills = comparison.getComparison().getSkillsOverlap().isEmpty()
                ? "No common skills detected. "
                : "Shared: " + String.join(", ", comparison.getComparison().getSkillsOverlap()) + ". ";
        String expText = trimToEmpty(comparison.getComparison().getExperienceDifference());

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent("comparison");
        response.setCandidates(enriched);
        response.setTopCandidate(enriched.get(0));
        response.setMessage("Comparing " + winner.getFullName() + " vs " + runner.getFullName()
                + ". Recommendation: " + winner.getFullName() + ".");
        response.setExplanation(scoreAdvantage + (expText.isBlank() ? "" : expText + " ") + sharedSkills);
        response.setSuggestedActions(List.of("shortlist_winner", "interview_kit_winner"));
        return response;
    }

    private ChatResponse generateInterviewKit(String conversationId, ConversationState state, ChatRequest request, String message) {
        CandidateResponse candidate = resolveCandidate(state, request, message);
        if (candidate == null) {
            return simpleResponse(conversationId, "interview_kit",
                    "Please select a candidate first, then ask me to generate interview questions.",
                    List.of("find_candidate"));
        }

        state.selectedCandidateId = candidate.getId();
        InterviewKitResponse kit;
        try {
            kit = interviewKitService.generate(candidate.getId());
        } catch (Exception e) {
            return simpleResponse(conversationId, "interview_kit",
                    "Could not generate interview kit for " + candidate.getFullName() + ". Please try again.",
                    List.of());
        }

        int totalQuestions = kit.getTechnical().size() + kit.getHr().size()
                + kit.getProject().size() + kit.getClarification().size();

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent("interview_kit");
        response.setInterviewKit(kit);
        response.setMessage("Interview kit ready for " + candidate.getFullName()
                + " (" + totalQuestions + " questions).");
        response.setExplanation("Tailored to " + valueOrUnknown(candidate.getSeniorityLevel())
                + " level — " + valueOrUnknown(candidate.getCurrentJobTitle())
                + ". Based on CV skills and project history.");
        response.setSuggestedActions(List.of("shortlist", "open_profile"));
        return response;
    }

    // ─── INTENT DETECTION ───────────────────────────────────────────────────

    private Intent detectIntent(String message, ConversationState state) {
        String normalized = message.toLowerCase(Locale.ROOT);
        QuerySignals signals = extractSignals(message);

        boolean hasCandidateContext = state.selectedCandidateId != null
                || (state.lastResults != null && !state.lastResults.isEmpty())
                || candidateNameMentioned(message, state);

        boolean asksForSummary = normalized.contains("summarize")
                || normalized.contains("summary")
                || normalized.contains("strength")
                || normalized.contains("weakness")
                || normalized.contains("tell me about")
                || normalized.contains("profile")
                || normalized.contains("about him")
                || normalized.contains("about her");

        boolean asksForSearch = !signals.skills.isEmpty()
                || !signals.roles.isEmpty()
                || signals.seniority != null
                || normalized.contains("find")
                || normalized.contains("need")
                || normalized.contains("show me")
                || normalized.contains("candidate");

        boolean asksForInterview = normalized.contains("interview")
                || (normalized.contains("question") && normalized.contains("ask"))
                || normalized.contains("interview kit")
                || normalized.contains("prepare interview");

        if (asksForInterview && hasCandidateContext) {
            return Intent.INTERVIEW_KIT;
        }
        if (asksForSummary && (hasCandidateContext || !asksForSearch)) {
            return Intent.SUMMARY;
        }
        if (normalized.contains("compare") || normalized.contains("which one")
                || normalized.contains("who is better") || normalized.contains("vs ")
                || normalized.contains("between")) {
            return Intent.COMPARISON;
        }
        if (normalized.contains("job description")
                || normalized.contains("responsibilities")
                || normalized.contains("requirements")
                || normalized.length() > 350) {
            return Intent.JOB_MATCH;
        }
        if (hasPreviousResults(state)
                && (normalized.startsWith("only ") || normalized.startsWith("just ")
                        || normalized.contains(" filter ") || normalized.startsWith("with ")
                        || normalized.startsWith("and ") || normalized.startsWith("make it ")
                        || normalized.startsWith("show me ") || normalized.startsWith("what about ")
                        || normalized.startsWith("now ") || normalized.startsWith("also "))) {
            return Intent.FOLLOW_UP;
        }
        return Intent.SEARCH;
    }

    // ─── ENRICHMENT ──────────────────────────────────────────────────────────

    private ChatCandidateResponse enrichCandidate(CandidateResponse candidate, QuerySignals signals) {
        ChatCandidateResponse response = new ChatCandidateResponse();
        response.setCandidate(candidate);
        response.setReasons(buildReasons(candidate, signals));
        response.setStrengths(buildStrengths(candidate));
        response.setWeaknesses(buildWeaknesses(candidate, signals));
        response.setExplanation("Matched on " + summarizeReasons(response.getReasons()) + ".");
        response.setHiringRecommendation(computeHiringRecommendation(candidate));
        return response;
    }

    private List<String> buildReasons(CandidateResponse candidate, QuerySignals signals) {
        List<String> reasons = new ArrayList<>();

        if (!signals.skills.isEmpty() && candidate.getSkills() != null) {
            List<String> matched = signals.skills.stream()
                    .filter(skill -> candidate.getSkills().stream()
                            .anyMatch(cs -> contains(cs, skill)))
                    .collect(Collectors.toList());
            if (!matched.isEmpty()) {
                reasons.add("Skill match: " + String.join(", ", matched));
            }
        }

        if (signals.seniority != null && equalsIgnoreCase(candidate.getSeniorityLevel(), signals.seniority)) {
            reasons.add("Seniority match: " + candidate.getSeniorityLevel());
        }

        if (!signals.roles.isEmpty() && candidate.getCurrentJobTitle() != null) {
            List<String> matchedRoles = signals.roles.stream()
                    .filter(role -> contains(candidate.getCurrentJobTitle(), role))
                    .collect(Collectors.toList());
            if (!matchedRoles.isEmpty()) {
                reasons.add("Role relevance: " + candidate.getCurrentJobTitle());
            }
        }

        if (candidate.getYearsOfExperience() != null) {
            reasons.add(formatExperience(candidate.getYearsOfExperience()) + " of experience");
        }

        if (candidate.getAiMatchScore() != null) {
            reasons.add("AI match score: " + candidate.getAiMatchScore() + "%");
        }

        if (reasons.isEmpty()) {
            reasons.add("Semantically close to the request via CV text analysis");
        }

        return reasons;
    }

    private List<String> buildStrengths(CandidateResponse candidate) {
        List<String> strengths = new ArrayList<>();
        if (candidate.getSkills() != null && !candidate.getSkills().isEmpty()) {
            strengths.add("Skills: " + candidate.getSkills().stream().limit(6).collect(Collectors.joining(", ")));
        }
        if (candidate.getCurrentJobTitle() != null && !candidate.getCurrentJobTitle().isBlank()) {
            strengths.add("Current role: " + candidate.getCurrentJobTitle());
        }
        if (candidate.getSeniorityLevel() != null && !candidate.getSeniorityLevel().isBlank()) {
            strengths.add("Seniority: " + candidate.getSeniorityLevel());
        }
        if (candidate.getYearsOfExperience() != null && candidate.getYearsOfExperience() > 0) {
            strengths.add("Experience: " + formatExperience(candidate.getYearsOfExperience()));
        }
        if (candidate.getHighestDegree() != null && !candidate.getHighestDegree().isBlank()) {
            strengths.add("Education: " + candidate.getHighestDegree());
        }
        return strengths;
    }

    private List<String> buildWeaknesses(CandidateResponse candidate, QuerySignals signals) {
        List<String> weaknesses = new ArrayList<>();

        if (!signals.skills.isEmpty()) {
            List<String> missing = signals.skills.stream()
                    .filter(skill -> candidate.getSkills() == null
                            || candidate.getSkills().stream().noneMatch(cs -> contains(cs, skill)))
                    .collect(Collectors.toList());
            if (!missing.isEmpty()) {
                weaknesses.add("Missing skills from query: " + String.join(", ", missing));
            }
        }

        if (signals.seniority != null && !equalsIgnoreCase(candidate.getSeniorityLevel(), signals.seniority)) {
            weaknesses.add("Seniority is " + valueOrUnknown(candidate.getSeniorityLevel())
                    + " (requested: " + signals.seniority + ")");
        }

        if (candidate.getParsingWarnings() != null && !candidate.getParsingWarnings().isEmpty()) {
            weaknesses.add("CV parsing note: " + candidate.getParsingWarnings().get(0));
        }

        if (weaknesses.isEmpty()) {
            weaknesses.add("No explicit gaps identified from the available CV data");
        }

        return weaknesses;
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private String computeHiringRecommendation(CandidateResponse candidate) {
        if (candidate.getAiMatchScore() == null) return "Consider";
        double score = candidate.getAiMatchScore();
        if (score >= 80) return "Strong Hire";
        if (score >= 65) return "Recommended";
        if (score >= 45) return "Consider";
        return "Needs Review";
    }

    private CandidateResponse resolveCandidate(ConversationState state, ChatRequest request, String message) {
        if (request != null && request.getSelectedCandidateId() != null
                && !request.getSelectedCandidateId().isBlank()) {
            try {
                return candidateService.getCandidateById(request.getSelectedCandidateId());
            } catch (Exception ignored) {}
        }

        // Check last results for name mention (cheap)
        if (state.lastResults != null && !state.lastResults.isEmpty()) {
            String normalized = message.toLowerCase(Locale.ROOT);
            for (CandidateResponse c : state.lastResults) {
                if (c.getFullName() != null && normalized.contains(c.getFullName().toLowerCase(Locale.ROOT))) {
                    return c;
                }
            }
        }

        if (state.selectedCandidateId != null) {
            try {
                return candidateService.getCandidateById(state.selectedCandidateId);
            } catch (Exception ignored) {}
        }

        if (state.lastResults != null && !state.lastResults.isEmpty()) {
            return state.lastResults.get(0);
        }

        // Expensive fallback: search all candidates for name match
        if (!message.isBlank()) {
            try {
                String normalized = message.toLowerCase(Locale.ROOT);
                return candidateService.getAllCandidates().stream()
                        .filter(c -> c.getFullName() != null
                                && normalized.contains(c.getFullName().toLowerCase(Locale.ROOT)))
                        .findFirst().orElse(null);
            } catch (Exception ignored) {}
        }

        return null;
    }

    private boolean candidateNameMentioned(String message, ConversationState state) {
        String normalized = message.toLowerCase(Locale.ROOT);
        // Check last results first (O(n) on a small list — cheap)
        if (state.lastResults != null && !state.lastResults.isEmpty()) {
            return state.lastResults.stream()
                    .anyMatch(c -> c.getFullName() != null
                            && normalized.contains(c.getFullName().toLowerCase(Locale.ROOT)));
        }
        return false;
    }

    private List<CandidateResponse> applyFollowUpFilters(List<CandidateResponse> candidates, QuerySignals signals, boolean followUp) {
        if (!followUp) return candidates;
        return candidates.stream()
                .filter(c -> signals.seniority == null || equalsIgnoreCase(c.getSeniorityLevel(), signals.seniority))
                .filter(c -> signals.skills.isEmpty() || hasAnySkill(c, signals.skills))
                .collect(Collectors.toList());
    }

    private QuerySignals extractSignals(String message) {
        String normalized = trimToEmpty(message).toLowerCase(Locale.ROOT);
        QuerySignals signals = new QuerySignals();

        if (normalized.contains("junior") || normalized.contains("intern") || normalized.contains("entry")) {
            signals.seniority = "Junior";
        } else if (normalized.contains("senior") || normalized.contains("lead") || normalized.contains("principal")) {
            signals.seniority = "Senior";
        } else if (normalized.contains("mid") || normalized.contains("intermediate")) {
            signals.seniority = "Mid";
        }

        for (String skill : KNOWN_SKILLS) {
            if (normalized.contains(skill)) {
                signals.skills.add(skill);
            }
        }

        for (String role : ROLE_TERMS) {
            if (normalized.contains(role)) {
                signals.roles.add(role);
            }
        }

        return signals;
    }

    private boolean hasPreviousResults(ConversationState state) {
        return state.lastResults != null && !state.lastResults.isEmpty();
    }

    private String mergeFollowUp(String lastQuery, String message) {
        Set<String> parts = new LinkedHashSet<>();
        parts.add(lastQuery);
        parts.add(message);
        return String.join(" ", parts);
    }

    private String formatExperience(Double value) {
        int totalMonths = (int) Math.max(0, Math.round(value * 12));
        int years = totalMonths / 12;
        int months = totalMonths % 12;
        List<String> parts = new ArrayList<>();
        if (years > 0) parts.add(years + (years == 1 ? " year" : " years"));
        if (months > 0) parts.add(months + (months == 1 ? " month" : " months"));
        return parts.isEmpty() ? "less than 1 month" : String.join(" ", parts);
    }

    private ChatResponse simpleResponse(String conversationId, String intent, String message, List<String> actions) {
        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent(intent);
        response.setMessage(message);
        response.setExplanation(message);
        response.setSuggestedActions(actions);
        return response;
    }

    private String summaryText(CandidateResponse candidate, ChatCandidateResponse summary) {
        String reco = summary.getHiringRecommendation() != null ? " Hiring signal: " + summary.getHiringRecommendation() + "." : "";
        return candidate.getFullName() + " is a " + valueOrUnknown(candidate.getSeniorityLevel())
                + " — " + valueOrUnknown(candidate.getCurrentJobTitle()) + ". Strengths: "
                + String.join("; ", summary.getStrengths()) + ". Gaps: "
                + String.join("; ", summary.getWeaknesses()) + "." + reco;
    }

    private String summarizeReasons(List<String> reasons) {
        return reasons.stream().limit(3).collect(Collectors.joining(", "));
    }

    private String scoreText(CandidateResponse candidate) {
        return candidate.getAiMatchScore() == null ? "" : " (" + candidate.getAiMatchScore() + "%)";
    }

    private boolean hasAnySkill(CandidateResponse candidate, List<String> skills) {
        return candidate.getSkills() != null && skills.stream()
                .anyMatch(skill -> candidate.getSkills().stream()
                        .anyMatch(cs -> contains(cs, skill)));
    }

    private String normalizeConversationId(String value) {
        String trimmed = trimToEmpty(value);
        return trimmed.isBlank() ? UUID.randomUUID().toString() : trimmed;
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private boolean contains(String value, String term) {
        return value != null && term != null
                && value.toLowerCase(Locale.ROOT).contains(term.toLowerCase(Locale.ROOT));
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    // ─── INNER TYPES ─────────────────────────────────────────────────────────

    private enum Intent {
        SEARCH, FOLLOW_UP, SUMMARY, COMPARISON, JOB_MATCH, INTERVIEW_KIT
    }

    private static class QuerySignals {
        private String seniority;
        private final List<String> skills = new ArrayList<>();
        private final List<String> roles = new ArrayList<>();
    }

    private static class ConversationState {
        private String lastQuery;
        private String selectedCandidateId;
        private List<CandidateResponse> lastResults = List.of();
    }
}
