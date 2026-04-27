package com.st2i.cvfilter.dto;

public class ScoreBreakdownResponse {

    private Double globalScore;
    private Double skillsMatch;
    private Double experienceMatch;
    private Double seniorityMatch;
    private Double titleMatch;

    public ScoreBreakdownResponse() {
    }

    public ScoreBreakdownResponse(
            Double globalScore,
            Double skillsMatch,
            Double experienceMatch,
            Double seniorityMatch,
            Double titleMatch
    ) {
        this.globalScore = globalScore;
        this.skillsMatch = skillsMatch;
        this.experienceMatch = experienceMatch;
        this.seniorityMatch = seniorityMatch;
        this.titleMatch = titleMatch;
    }

    public Double getGlobalScore() {
        return globalScore;
    }

    public void setGlobalScore(Double globalScore) {
        this.globalScore = globalScore;
    }

    public Double getSkillsMatch() {
        return skillsMatch;
    }

    public void setSkillsMatch(Double skillsMatch) {
        this.skillsMatch = skillsMatch;
    }

    public Double getExperienceMatch() {
        return experienceMatch;
    }

    public void setExperienceMatch(Double experienceMatch) {
        this.experienceMatch = experienceMatch;
    }

    public Double getSeniorityMatch() {
        return seniorityMatch;
    }

    public void setSeniorityMatch(Double seniorityMatch) {
        this.seniorityMatch = seniorityMatch;
    }

    public Double getTitleMatch() {
        return titleMatch;
    }

    public void setTitleMatch(Double titleMatch) {
        this.titleMatch = titleMatch;
    }
}
