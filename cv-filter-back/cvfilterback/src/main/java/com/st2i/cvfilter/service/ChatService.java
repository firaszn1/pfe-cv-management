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
import com.st2i.cvfilter.dto.JobMatchRequest;
import com.st2i.cvfilter.dto.JobMatchResponse;
import com.st2i.cvfilter.dto.SmartSearchRequest;

@Service
public class ChatService {

    private static final int RESULT_LIMIT = 5;
    private static final Set<String> KNOWN_SKILLS = Set.of(
            "java", "react", "angular", "spring boot", "spring", "node", "node.js",
            "mysql", "sql", "python", "javascript", "typescript", "html", "css", "javafx",
            "mongodb", "docker", "git", "rest", "api"
    );
    private static final Set<String> ROLE_TERMS = Set.of(
            "frontend", "front end", "backend", "back end", "fullstack", "full stack",
            "developer", "engineer", "intern", "student"
    );

    private final CandidateService candidateService;
    private final JobMatchService jobMatchService;
    private final CandidateCompareService candidateCompareService;
    private final Map<String, ConversationState> conversations = new ConcurrentHashMap<>();

    public ChatService(CandidateService candidateService, JobMatchService jobMatchService,
                       CandidateCompareService candidateCompareService) {
        this.candidateService = candidateService;
        this.jobMatchService = jobMatchService;
        this.candidateCompareService = candidateCompareService;
    }

    public ChatResponse reply(ChatRequest request) {
        String conversationId = normalizeConversationId(request == null ? null : request.getConversationId());
        ConversationState state = conversations.computeIfAbsent(conversationId, ignored -> new ConversationState());
        String message = request == null ? "" : trimToEmpty(request.getMessage());

        if (message.isBlank()) {
            return simpleResponse(conversationId, "general",
                    "Tell me what profile you need, for example: \"Find me a junior Angular intern\".");
        }

        Intent intent = detectIntent(message, state);
        if (intent == Intent.SUMMARY) {
            return summarizeCandidate(conversationId, state, request, message);
        }

        if (intent == Intent.COMPARISON) {
            return compareCandidates(conversationId, state, message);
        }

        if (intent == Intent.JOB_MATCH) {
            return matchJobDescription(conversationId, state, message);
        }

        return searchCandidates(conversationId, state, message, intent == Intent.FOLLOW_UP);
    }

    private ChatResponse matchJobDescription(String conversationId, ConversationState state, String message) {
        JobMatchRequest request = new JobMatchRequest();
        request.setDescription(message);
        JobMatchResponse match = jobMatchService.match(request);
        List<CandidateResponse> candidates = match.getCandidates().stream()
                .limit(RESULT_LIMIT)
                .collect(Collectors.toList());

        state.lastQuery = message;
        state.lastResults = candidates;
        if (!candidates.isEmpty()) {
            state.selectedCandidateId = candidates.get(0).getId();
        }

        QuerySignals signals = extractSignals(message);
        List<ChatCandidateResponse> enriched = candidates.stream()
                .map(candidate -> enrichCandidate(candidate, signals))
                .collect(Collectors.toList());

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent("job_match");
        response.setCandidates(enriched);
        if (!enriched.isEmpty()) {
            response.setTopCandidate(enriched.get(0));
        }
        response.setMessage(enriched.isEmpty()
                ? "No candidates matched this job description strongly enough."
                : "Top job match: " + enriched.get(0).getCandidate().getFullName()
                        + scoreText(enriched.get(0).getCandidate()) + ".");
        response.setExplanation("Detected seniority: " + valueOrUnknown(match.getSeniority())
                + ". Detected keywords: " + String.join(", ", match.getKeywords()) + ".");
        return response;
    }

    private ChatResponse searchCandidates(
            String conversationId,
            ConversationState state,
            String message,
            boolean followUp
    ) {
        String searchQuery = followUp && state.lastQuery != null
                ? mergeFollowUp(state.lastQuery, message)
                : message;

        QuerySignals signals = extractSignals(searchQuery);
        QuerySignals messageSignals = extractSignals(message);
        List<CandidateResponse> candidates = followUp && state.lastResults != null && !state.lastResults.isEmpty()
                ? state.lastResults
                : candidateService.smartSearch(new SmartSearchRequest(searchQuery));
        List<CandidateResponse> filtered = applyFollowUpFilters(candidates, messageSignals, followUp)
                .stream()
                .limit(RESULT_LIMIT)
                .collect(Collectors.toList());

        if (filtered.isEmpty() && followUp) {
            candidates = candidateService.smartSearch(new SmartSearchRequest(searchQuery));
            filtered = applyFollowUpFilters(candidates, messageSignals, true)
                    .stream()
                    .limit(RESULT_LIMIT)
                    .collect(Collectors.toList());
        }

        state.lastQuery = searchQuery;
        state.lastResults = filtered;
        if (!filtered.isEmpty()) {
            state.selectedCandidateId = filtered.get(0).getId();
        }

        List<ChatCandidateResponse> enriched = filtered.stream()
                .map(candidate -> enrichCandidate(candidate, signals))
                .collect(Collectors.toList());

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent(followUp ? "follow_up_search" : "search");
        response.setCandidates(enriched);

        if (enriched.isEmpty()) {
            response.setMessage("I could not find a strong match for that request.");
            response.setExplanation("Try adding a skill, seniority level, or role such as Java, Junior, Backend, or Intern.");
            return response;
        }

        ChatCandidateResponse top = enriched.get(0);
        response.setTopCandidate(top);
        response.setMessage("Top match: " + top.getCandidate().getFullName()
                + scoreText(top.getCandidate()) + ".");
        response.setExplanation(top.getExplanation());
        return response;
    }

    private ChatResponse summarizeCandidate(
            String conversationId,
            ConversationState state,
            ChatRequest request,
            String message
    ) {
        CandidateResponse candidate = resolveCandidate(state, request, message);
        if (candidate == null) {
            return simpleResponse(conversationId, "summary",
                    "I need a candidate first. Select one from the chat results or mention their name.");
        }

        state.selectedCandidateId = candidate.getId();
        ChatCandidateResponse summary = enrichCandidate(candidate, extractSignals(state.lastQuery == null ? message : state.lastQuery));

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent("summary");
        response.setTopCandidate(summary);
        response.setCandidates(List.of(summary));
        response.setMessage("Summary for " + candidate.getFullName() + ".");
        response.setExplanation(summaryText(candidate, summary));
        return response;
    }

    private ChatResponse compareCandidates(String conversationId, ConversationState state, String message) {
        List<CandidateResponse> results = state.lastResults == null ? List.of() : state.lastResults;
        if (results.size() < 2) {
            return simpleResponse(conversationId, "comparison",
                    "I need at least two recent matches to compare. Search for candidates first.");
        }

        List<CandidateResponse> topTwo = results.stream()
                .sorted(Comparator.comparing(
                        candidate -> candidate.getAiMatchScore() == null ? 0.0 : candidate.getAiMatchScore(),
                        Comparator.reverseOrder()
                ))
                .limit(2)
                .collect(Collectors.toList());
        CandidateCompareRequest request = new CandidateCompareRequest();
        request.setCandidateIds(topTwo.stream().map(CandidateResponse::getId).collect(Collectors.toList()));
        CandidateCompareResponse comparison = candidateCompareService.compare(request);

        QuerySignals signals = extractSignals(state.lastQuery == null ? message : state.lastQuery);
        List<ChatCandidateResponse> enriched = comparison.getCandidates().stream()
                .map(candidate -> enrichCandidate(candidate, signals))
                .collect(Collectors.toList());

        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent("comparison");
        response.setCandidates(enriched);
        response.setTopCandidate(enriched.get(0));
        response.setMessage("I would pick " + enriched.get(0).getCandidate().getFullName()
                + " over " + enriched.get(1).getCandidate().getFullName() + ".");
        response.setExplanation(comparison.getComparison().getExperienceDifference()
                + " Shared skills: " + String.join(", ", comparison.getComparison().getSkillsOverlap()) + ".");
        return response;
    }

    private ChatCandidateResponse enrichCandidate(CandidateResponse candidate, QuerySignals signals) {
        ChatCandidateResponse response = new ChatCandidateResponse();
        response.setCandidate(candidate);
        response.setReasons(buildReasons(candidate, signals));
        response.setStrengths(buildStrengths(candidate));
        response.setWeaknesses(buildWeaknesses(candidate, signals));
        response.setExplanation("Matched on " + summarizeReasons(response.getReasons()) + ".");
        return response;
    }

    private List<String> buildReasons(CandidateResponse candidate, QuerySignals signals) {
        List<String> reasons = new ArrayList<>();

        if (!signals.skills.isEmpty() && candidate.getSkills() != null) {
            List<String> matchedSkills = signals.skills.stream()
                    .filter(skill -> candidate.getSkills().stream()
                            .anyMatch(candidateSkill -> contains(candidateSkill, skill)))
                    .collect(Collectors.toList());
            if (!matchedSkills.isEmpty()) {
                reasons.add("Has requested skill overlap: " + String.join(", ", matchedSkills));
            }
        }

        if (signals.seniority != null && equalsIgnoreCase(candidate.getSeniorityLevel(), signals.seniority)) {
            reasons.add("Matches requested seniority: " + candidate.getSeniorityLevel());
        }

        if (!signals.roles.isEmpty() && candidate.getCurrentJobTitle() != null) {
            List<String> matchedRoles = signals.roles.stream()
                    .filter(role -> contains(candidate.getCurrentJobTitle(), role))
                    .collect(Collectors.toList());
            if (!matchedRoles.isEmpty()) {
                reasons.add("Relevant job title: " + candidate.getCurrentJobTitle());
            }
        }

        if (candidate.getYearsOfExperience() != null) {
            reasons.add(formatExperience(candidate.getYearsOfExperience()) + " of experience");
        }

        if (candidate.getAiMatchScore() != null) {
            reasons.add("AI match score " + candidate.getAiMatchScore() + "%");
        }

        if (reasons.isEmpty()) {
            reasons.add("Profile text is semantically close to the HR request");
        }

        return reasons;
    }

    private List<String> buildStrengths(CandidateResponse candidate) {
        List<String> strengths = new ArrayList<>();
        if (candidate.getSkills() != null && !candidate.getSkills().isEmpty()) {
            strengths.add("Core skills: " + candidate.getSkills().stream().limit(5).collect(Collectors.joining(", ")));
        }
        if (candidate.getCurrentJobTitle() != null && !candidate.getCurrentJobTitle().isBlank()) {
            strengths.add("Current role: " + candidate.getCurrentJobTitle());
        }
        if (candidate.getSeniorityLevel() != null && !candidate.getSeniorityLevel().isBlank()) {
            strengths.add("Seniority: " + candidate.getSeniorityLevel());
        }
        return strengths;
    }

    private List<String> buildWeaknesses(CandidateResponse candidate, QuerySignals signals) {
        List<String> weaknesses = new ArrayList<>();
        if (!signals.skills.isEmpty()) {
            List<String> missingSkills = signals.skills.stream()
                    .filter(skill -> candidate.getSkills() == null ||
                            candidate.getSkills().stream().noneMatch(candidateSkill -> contains(candidateSkill, skill)))
                    .collect(Collectors.toList());
            if (!missingSkills.isEmpty()) {
                weaknesses.add("Missing explicit skills from query: " + String.join(", ", missingSkills));
            }
        }
        if (signals.seniority != null && !equalsIgnoreCase(candidate.getSeniorityLevel(), signals.seniority)) {
            weaknesses.add("Seniority is " + valueOrUnknown(candidate.getSeniorityLevel())
                    + ", not explicitly " + signals.seniority);
        }
        if (weaknesses.isEmpty()) {
            weaknesses.add("No obvious gap from the available CV data");
        }
        return weaknesses;
    }

    private CandidateResponse resolveCandidate(ConversationState state, ChatRequest request, String message) {
        if (request != null && request.getSelectedCandidateId() != null && !request.getSelectedCandidateId().isBlank()) {
            return candidateService.getCandidateById(request.getSelectedCandidateId());
        }

        List<CandidateResponse> allCandidates = candidateService.getAllCandidates();
        String normalized = message.toLowerCase(Locale.ROOT);
        for (CandidateResponse candidate : allCandidates) {
            if (candidate.getFullName() != null && normalized.contains(candidate.getFullName().toLowerCase(Locale.ROOT))) {
                return candidate;
            }
        }

        if (state.selectedCandidateId != null) {
            return candidateService.getCandidateById(state.selectedCandidateId);
        }

        if (state.lastResults != null && !state.lastResults.isEmpty()) {
            return state.lastResults.get(0);
        }

        return null;
    }

    private List<CandidateResponse> applyFollowUpFilters(
            List<CandidateResponse> candidates,
            QuerySignals followUpSignals,
            boolean followUp
    ) {
        if (!followUp) {
            return candidates;
        }

        return candidates.stream()
                .filter(candidate -> followUpSignals.seniority == null ||
                        equalsIgnoreCase(candidate.getSeniorityLevel(), followUpSignals.seniority))
                .filter(candidate -> followUpSignals.skills.isEmpty() || hasAnySkill(candidate, followUpSignals.skills))
                .collect(Collectors.toList());
    }

    private Intent detectIntent(String message, ConversationState state) {
        String normalized = message.toLowerCase(Locale.ROOT);
        QuerySignals signals = extractSignals(message);
        boolean hasCandidateContext = state.selectedCandidateId != null
                || (state.lastResults != null && !state.lastResults.isEmpty())
                || candidateNameMentioned(message);
        boolean asksForSummary = normalized.contains("summarize")
                || normalized.contains("summary")
                || normalized.contains("strength")
                || normalized.contains("weakness")
                || normalized.contains("tell me about");
        boolean asksForSearch = !signals.skills.isEmpty()
                || !signals.roles.isEmpty()
                || signals.seniority != null
                || normalized.contains("find")
                || normalized.contains("need")
                || normalized.contains("candidate");

        if (asksForSummary && (hasCandidateContext || !asksForSearch)) {
            return Intent.SUMMARY;
        }
        if (normalized.contains("compare") || normalized.contains("which one")
                || normalized.contains("who is better")) {
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
                || normalized.startsWith("and ")
                || normalized.startsWith("make it ")
                || normalized.startsWith("show me ")
                || normalized.startsWith("what about ")
                || normalized.startsWith("now "))) {
            return Intent.FOLLOW_UP;
        }
        return Intent.SEARCH;
    }

    private boolean hasPreviousResults(ConversationState state) {
        return state.lastResults != null && !state.lastResults.isEmpty();
    }

    private boolean candidateNameMentioned(String message) {
        String normalized = message.toLowerCase(Locale.ROOT);
        return candidateService.getAllCandidates().stream()
                .anyMatch(candidate -> candidate.getFullName() != null
                        && normalized.contains(candidate.getFullName().toLowerCase(Locale.ROOT)));
    }

    private QuerySignals extractSignals(String message) {
        String normalized = trimToEmpty(message).toLowerCase(Locale.ROOT);
        QuerySignals signals = new QuerySignals();

        if (normalized.contains("junior") || normalized.contains("intern")) {
            signals.seniority = "Junior";
        } else if (normalized.contains("senior")) {
            signals.seniority = "Senior";
        } else if (normalized.contains("mid")) {
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

        if (years > 0) {
            parts.add(years + (years == 1 ? " year" : " years"));
        }
        if (months > 0) {
            parts.add(months + (months == 1 ? " month" : " months"));
        }

        return parts.isEmpty() ? "less than 1 month" : String.join(" ", parts);
    }

    private ChatResponse simpleResponse(String conversationId, String intent, String message) {
        ChatResponse response = new ChatResponse();
        response.setConversationId(conversationId);
        response.setIntent(intent);
        response.setMessage(message);
        response.setExplanation(message);
        return response;
    }

    private String summaryText(CandidateResponse candidate, ChatCandidateResponse summary) {
        return candidate.getFullName() + " is a " + valueOrUnknown(candidate.getSeniorityLevel())
                + " profile for " + valueOrUnknown(candidate.getCurrentJobTitle()) + ". Main strengths: "
                + String.join("; ", summary.getStrengths()) + ". Possible gaps: "
                + String.join("; ", summary.getWeaknesses()) + ".";
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
                        .anyMatch(candidateSkill -> contains(candidateSkill, skill)));
    }

    private String normalizeConversationId(String value) {
        String trimmed = trimToEmpty(value);
        return trimmed.isBlank() ? UUID.randomUUID().toString() : trimmed;
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private boolean contains(String value, String term) {
        return value != null && term != null &&
                value.toLowerCase(Locale.ROOT).contains(term.toLowerCase(Locale.ROOT));
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private enum Intent {
        SEARCH,
        FOLLOW_UP,
        SUMMARY,
        COMPARISON,
        JOB_MATCH
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
