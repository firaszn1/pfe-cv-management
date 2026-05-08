package com.st2i.cvfilter.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.st2i.cvfilter.dto.ScoreBreakdownResponse;
import com.st2i.cvfilter.model.Candidate;
import com.st2i.cvfilter.service.CandidateScoringService.QuerySignals;

class CandidateScoringServiceTest {

    private final CandidateScoringService scoring = new CandidateScoringService();

    @Test
    void exactRequiredSkillsRankHigherThanSemanticOnlyCandidates() {
        QuerySignals signals = scoring.extractSignals("senior react frontend developer");
        Candidate reactSenior = candidate("Senior React Frontend Developer", "Senior", 6.0, "React", "JavaScript");
        Candidate javaSenior = candidate("Senior Backend Developer", "Senior", 7.0, "Java", "Spring Boot");

        ScoreBreakdownResponse reactScore = scoring.score(reactSenior, signals, 20.0);
        ScoreBreakdownResponse javaScore = scoring.score(javaSenior, signals, 90.0);

        assertThat(reactScore.getGlobalScore()).isGreaterThan(javaScore.getGlobalScore());
        assertThat(scoring.missingRequirements(javaSenior, signals)).contains("No React detected");
    }

    @Test
    void juniorInternQueryFavorsJuniorCandidatesOverSeniorProfiles() {
        QuerySignals signals = scoring.extractSignals("junior angular intern");
        Candidate junior = candidate("Stagiaire Développement Web", "Junior", 0.5, "Angular", "TypeScript");
        Candidate senior = candidate("Senior Angular Developer", "Senior", 8.0, "Angular", "TypeScript");

        assertThat(scoring.score(junior, signals, 10.0).getGlobalScore())
                .isGreaterThan(scoring.score(senior, signals, 10.0).getGlobalScore());
    }

    @Test
    void seniorQueryPenalizesJuniorEvenWithMatchingSkill() {
        QuerySignals signals = scoring.extractSignals("java backend senior");
        Candidate senior = candidate("Java Backend Developer", "Senior", 6.0, "Java", "Spring Boot");
        Candidate junior = candidate("Java Backend Developer", "Junior", 1.0, "Java", "Spring Boot");

        assertThat(scoring.score(senior, signals, 0.0).getGlobalScore())
                .isGreaterThan(scoring.score(junior, signals, 0.0).getGlobalScore());
    }

    @Test
    void querySignalExtractionUnderstandsRepresentativeQueries() {
        assertThat(scoring.extractSignals("spring boot backend developer").getSkills()).contains("spring boot");
        assertThat(scoring.extractSignals("student node mysql").getSkills()).contains("node", "mysql");
        assertThat(scoring.extractSignals("data analyst python").getSkills()).contains("python");
    }

    private Candidate candidate(String title, String seniority, Double years, String... skills) {
        Candidate candidate = new Candidate();
        candidate.setCurrentJobTitle(title);
        candidate.setSeniorityLevel(seniority);
        candidate.setYearsOfExperience(years);
        candidate.setSkills(List.of(skills));
        return candidate;
    }
}
