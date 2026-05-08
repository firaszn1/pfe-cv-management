package com.st2i.cvfilter.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.st2i.cvfilter.dto.ScoreBreakdownResponse;
import com.st2i.cvfilter.model.Candidate;

@Service
public class CandidateScoringService {

    private static final Set<String> KNOWN_SKILLS = Set.of(
            "java", "react", "angular", "spring boot", "spring", "node", "node.js",
            "mysql", "sql", "python", "javascript", "typescript", "html", "css", "javafx",
            "mongodb", "docker", "git", "keycloak", "rest", "api", "php", "laravel",
            "data", "excel", "power bi"
    );

    private static final Set<String> KNOWN_TITLES = Set.of(
            "frontend developer", "backend developer", "fullstack developer", "full stack developer",
            "developer", "engineer", "intern", "student", "frontend", "backend", "web software engineer"
    );

    public QuerySignals extractSignals(String text) {
        String normalized = normalize(text);
        QuerySignals signals = new QuerySignals();

        if (normalized.contains("junior") || normalized.contains("intern") || normalized.contains("stagiaire")
                || normalized.contains("student") || normalized.contains("etudiant")) {
            signals.setSeniority("Junior");
        } else if (normalized.contains("senior")) {
            signals.setSeniority("Senior");
        } else if (normalized.contains("mid")) {
            signals.setSeniority("Mid");
        }

        for (String skill : KNOWN_SKILLS) {
            if (normalized.contains(skill)) {
                signals.getSkills().add(skill);
            }
        }
        if (normalized.contains("frontend") || normalized.contains("front end")) {
            signals.getSkills().add("javascript");
        }
        if (normalized.contains("react")) {
            signals.getSkills().add("react");
        }
        if (normalized.contains("backend") && normalized.contains("java")) {
            signals.getSkills().add("spring boot");
        }

        for (String title : KNOWN_TITLES) {
            if (normalized.contains(title)) {
                signals.getTitles().add(title);
            }
        }

        return signals;
    }

    public ScoreBreakdownResponse score(Candidate candidate, QuerySignals signals) {
        return score(candidate, signals, 0.0);
    }

    public ScoreBreakdownResponse score(Candidate candidate, QuerySignals signals, double semanticMatch) {
        double skills = scoreSkills(candidate, signals);
        double experience = scoreExperience(candidate, signals);
        double seniority = scoreSeniority(candidate, signals);
        double title = scoreTitle(candidate, signals);
        double semantic = clamp(semanticMatch);
        double global = (skills * 0.40) + (title * 0.20) + (seniority * 0.20) + (experience * 0.15) + (semantic * 0.05);

        if (!signals.getSkills().isEmpty() && skills < 50.0) {
            global *= 0.65;
        }
        if (signals.getSeniority() != null && seniority == 0.0) {
            global *= 0.55;
        }

        return new ScoreBreakdownResponse(
                round(global),
                round(skills),
                round(experience),
                round(seniority),
                round(title),
                round(semantic)
        );
    }

    public boolean matchesRequiredSeniority(Candidate candidate, QuerySignals signals) {
        return true;
    }

    public List<String> matchReasons(Candidate candidate, QuerySignals signals) {
        List<String> reasons = new ArrayList<>();
        for (String skill : matchedSkills(candidate, signals)) {
            reasons.add("Matched " + formatSkill(skill));
        }
        if (signals.getSeniority() != null && candidate.getSeniorityLevel() != null
                && candidate.getSeniorityLevel().equalsIgnoreCase(signals.getSeniority())) {
            reasons.add("Candidate is " + candidate.getSeniorityLevel());
        }
        if (!signals.getTitles().isEmpty() && scoreTitle(candidate, signals) >= 80.0) {
            reasons.add("Job title matches requested role");
        }
        return reasons;
    }

    public List<String> missingRequirements(Candidate candidate, QuerySignals signals) {
        List<String> missing = new ArrayList<>();
        for (String skill : signals.getSkills()) {
            if (!matchedSkills(candidate, signals).contains(skill)) {
                missing.add("No " + formatSkill(skill) + " detected");
            }
        }
        if (signals.getSeniority() != null && (candidate.getSeniorityLevel() == null
                || !candidate.getSeniorityLevel().equalsIgnoreCase(signals.getSeniority()))) {
            missing.add("Seniority is not " + signals.getSeniority());
        }
        return missing;
    }

    private double scoreSkills(Candidate candidate, QuerySignals signals) {
        if (signals.getSkills().isEmpty()) {
            return 70.0;
        }

        List<String> candidateSkills = candidate.getSkills() == null ? List.of() : candidate.getSkills();
        long matched = matchedSkills(candidate, signals).size();
        return ((double) matched / signals.getSkills().size()) * 100.0;
    }

    private double scoreExperience(Candidate candidate, QuerySignals signals) {
        Double years = candidate.getYearsOfExperience();
        if (years == null) {
            return 45.0;
        }

        String seniority = signals.getSeniority();
        if ("Senior".equalsIgnoreCase(seniority)) {
            return clamp((years / 5.0) * 100.0);
        }
        if ("Mid".equalsIgnoreCase(seniority)) {
            if (years >= 2.0 && years < 5.0) {
                return 100.0;
            }
            return years < 2.0 ? 55.0 : 80.0;
        }
        if ("Junior".equalsIgnoreCase(seniority)) {
            if (years <= 1.5) {
                return 100.0;
            }
            return years <= 2.5 ? 80.0 : 35.0;
        }

        return clamp(55.0 + (years * 8.0));
    }

    private double scoreSeniority(Candidate candidate, QuerySignals signals) {
        if (signals.getSeniority() == null) {
            return 70.0;
        }
        if (candidate.getSeniorityLevel() == null) {
            return 30.0;
        }
        if (candidate.getSeniorityLevel().equalsIgnoreCase(signals.getSeniority())) {
            return 100.0;
        }
        if ("Senior".equalsIgnoreCase(signals.getSeniority()) && "Mid".equalsIgnoreCase(candidate.getSeniorityLevel())) {
            return 45.0;
        }
        if ("Junior".equalsIgnoreCase(signals.getSeniority()) && "Mid".equalsIgnoreCase(candidate.getSeniorityLevel())) {
            return 35.0;
        }
        return 0.0;
    }

    private double scoreTitle(Candidate candidate, QuerySignals signals) {
        if (signals.getTitles().isEmpty()) {
            return 70.0;
        }
        if (candidate.getCurrentJobTitle() == null) {
            return 25.0;
        }
        return signals.getTitles().stream()
                .anyMatch(title -> titleMatches(candidate.getCurrentJobTitle(), title))
                ? 100.0
                : 35.0;
    }

    private Set<String> matchedSkills(Candidate candidate, QuerySignals signals) {
        List<String> candidateSkills = candidate.getSkills() == null ? List.of() : candidate.getSkills();
        Set<String> matched = new LinkedHashSet<>();
        for (String skill : signals.getSkills()) {
            if (candidateSkills.stream().anyMatch(candidateSkill -> contains(candidateSkill, skill))) {
                matched.add(skill);
            }
        }
        return matched;
    }

    private boolean titleMatches(String candidateTitle, String queryTitle) {
        String title = normalize(candidateTitle);
        String query = normalize(queryTitle);
        return title.contains(query)
                || (query.contains("frontend") && title.contains("front"))
                || (query.contains("backend") && title.contains("back"))
                || (query.contains("intern") && (title.contains("intern") || title.contains("stagiaire") || title.contains("student")));
    }

    private String formatSkill(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        if ("spring boot".equals(value)) return "Spring Boot";
        if ("javascript".equals(value)) return "JavaScript";
        if ("typescript".equals(value)) return "TypeScript";
        if ("mysql".equals(value)) return "MySQL";
        if ("node.js".equals(value)) return "Node.js";
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private boolean contains(String value, String term) {
        return value != null && term != null && normalize(value).contains(normalize(term));
    }

    private double clamp(double value) {
        if (value < 0.0) {
            return 0.0;
        }
        if (value > 100.0) {
            return 100.0;
        }
        return value;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    public static class QuerySignals {
        private String seniority;
        private final List<String> skills = new ArrayList<>();
        private final List<String> titles = new ArrayList<>();

        public String getSeniority() {
            return seniority;
        }

        public void setSeniority(String seniority) {
            this.seniority = seniority;
        }

        public List<String> getSkills() {
            return skills;
        }

        public List<String> getTitles() {
            return titles;
        }

        public List<String> getKeywords() {
            Set<String> keywords = new LinkedHashSet<>();
            keywords.addAll(skills);
            keywords.addAll(titles);
            return new ArrayList<>(keywords);
        }
    }
}
