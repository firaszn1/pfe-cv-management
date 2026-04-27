package com.st2i.cvfilter.service;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.st2i.cvfilter.dto.CandidateCompareRequest;
import com.st2i.cvfilter.dto.CandidateCompareResponse;
import com.st2i.cvfilter.dto.CandidateComparisonDetails;
import com.st2i.cvfilter.dto.CandidateResponse;

@Service
public class CandidateCompareService {

    private final CandidateService candidateService;

    public CandidateCompareService(CandidateService candidateService) {
        this.candidateService = candidateService;
    }

    public CandidateCompareResponse compare(CandidateCompareRequest request) {
        List<String> ids = request == null || request.getCandidateIds() == null
                ? List.of()
                : request.getCandidateIds().stream().distinct().limit(3).collect(Collectors.toList());

        List<CandidateResponse> candidates = ids.stream()
                .map(candidateService::getCandidateById)
                .collect(Collectors.toList());

        CandidateComparisonDetails details = new CandidateComparisonDetails();
        details.setSkillsOverlap(skillsOverlap(candidates));
        details.setExperienceDifference(experienceDifference(candidates));
        details.setStrengths(strengths(candidates));
        details.setWeaknesses(weaknesses(candidates));

        CandidateCompareResponse response = new CandidateCompareResponse();
        response.setCandidates(candidates);
        response.setComparison(details);
        return response;
    }

    private List<String> skillsOverlap(List<CandidateResponse> candidates) {
        if (candidates.isEmpty()) {
            return List.of();
        }

        Set<String> overlap = new LinkedHashSet<>(safeSkills(candidates.get(0)));
        for (CandidateResponse candidate : candidates) {
            overlap.retainAll(safeSkills(candidate));
        }
        return overlap.stream().sorted(String.CASE_INSENSITIVE_ORDER).collect(Collectors.toList());
    }

    private String experienceDifference(List<CandidateResponse> candidates) {
        if (candidates.isEmpty()) {
            return "No candidates selected";
        }

        CandidateResponse min = candidates.stream()
                .min(Comparator.comparing(candidate -> candidate.getYearsOfExperience() == null ? 0.0 : candidate.getYearsOfExperience()))
                .orElse(candidates.get(0));
        CandidateResponse max = candidates.stream()
                .max(Comparator.comparing(candidate -> candidate.getYearsOfExperience() == null ? 0.0 : candidate.getYearsOfExperience()))
                .orElse(candidates.get(0));
        return max.getFullName() + " has the most experience (" + value(max.getYearsOfExperience())
                + " years), while " + min.getFullName() + " has " + value(min.getYearsOfExperience()) + " years.";
    }

    private List<String> strengths(List<CandidateResponse> candidates) {
        return candidates.stream()
                .map(candidate -> candidate.getFullName() + ": "
                        + value(candidate.getSeniorityLevel()) + ", "
                        + value(candidate.getCurrentJobTitle()) + ", skills: "
                        + String.join(", ", safeSkills(candidate).stream().limit(4).toList()))
                .collect(Collectors.toList());
    }

    private List<String> weaknesses(List<CandidateResponse> candidates) {
        return candidates.stream()
                .map(candidate -> {
                    if (candidate.getSkills() == null || candidate.getSkills().isEmpty()) {
                        return candidate.getFullName() + ": skills are unclear.";
                    }
                    if (candidate.getYearsOfExperience() == null) {
                        return candidate.getFullName() + ": years of experience are unclear.";
                    }
                    if (candidate.getCurrentJobTitle() == null || candidate.getCurrentJobTitle().isBlank()) {
                        return candidate.getFullName() + ": current job title is unclear.";
                    }
                    return candidate.getFullName() + ": no obvious profile gap from structured CV data.";
                })
                .collect(Collectors.toList());
    }

    private Set<String> safeSkills(CandidateResponse candidate) {
        return candidate.getSkills() == null
                ? Set.of()
                : candidate.getSkills().stream().collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String value(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private String value(Double value) {
        return value == null ? "unknown" : value.toString();
    }
}
