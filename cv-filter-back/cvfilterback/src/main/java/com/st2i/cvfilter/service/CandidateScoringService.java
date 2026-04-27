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
            "mongodb", "docker", "git", "keycloak", "rest", "api"
    );

    private static final Set<String> KNOWN_TITLES = Set.of(
            "frontend developer", "backend developer", "fullstack developer", "full stack developer",
            "developer", "engineer", "intern", "student", "frontend", "backend", "web software engineer"
    );

    public QuerySignals extractSignals(String text) {
        String normalized = normalize(text);
        QuerySignals signals = new QuerySignals();

        if (normalized.contains("junior") || normalized.contains("intern")) {
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

        for (String title : KNOWN_TITLES) {
            if (normalized.contains(title)) {
                signals.getTitles().add(title);
            }
        }

        return signals;
    }

    public ScoreBreakdownResponse score(Candidate candidate, QuerySignals signals) {
        double skills = scoreSkills(candidate, signals);
        double experience = scoreExperience(candidate, signals);
        double seniority = scoreSeniority(candidate, signals);
        double title = scoreTitle(candidate, signals);
        double global = (skills * 0.40) + (experience * 0.25) + (seniority * 0.20) + (title * 0.15);
        return new ScoreBreakdownResponse(
                round(global),
                round(skills),
                round(experience),
                round(seniority),
                round(title)
        );
    }

    public boolean matchesRequiredSeniority(Candidate candidate, QuerySignals signals) {
        return signals.getSeniority() == null
                || (candidate.getSeniorityLevel() != null
                && candidate.getSeniorityLevel().equalsIgnoreCase(signals.getSeniority()));
    }

    private double scoreSkills(Candidate candidate, QuerySignals signals) {
        if (signals.getSkills().isEmpty()) {
            return 70.0;
        }

        List<String> candidateSkills = candidate.getSkills() == null ? List.of() : candidate.getSkills();
        long matched = signals.getSkills().stream()
                .filter(skill -> candidateSkills.stream().anyMatch(candidateSkill -> contains(candidateSkill, skill)))
                .count();
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
            return years <= 2.0 ? 100.0 : 75.0;
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
        return candidate.getSeniorityLevel().equalsIgnoreCase(signals.getSeniority()) ? 100.0 : 0.0;
    }

    private double scoreTitle(Candidate candidate, QuerySignals signals) {
        if (signals.getTitles().isEmpty()) {
            return 70.0;
        }
        if (candidate.getCurrentJobTitle() == null) {
            return 25.0;
        }
        return signals.getTitles().stream()
                .anyMatch(title -> contains(candidate.getCurrentJobTitle(), title))
                ? 100.0
                : 35.0;
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
