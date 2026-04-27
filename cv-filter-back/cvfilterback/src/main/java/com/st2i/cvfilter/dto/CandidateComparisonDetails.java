package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class CandidateComparisonDetails {

    private List<String> skillsOverlap = new ArrayList<>();
    private String experienceDifference;
    private List<String> strengths = new ArrayList<>();
    private List<String> weaknesses = new ArrayList<>();

    public List<String> getSkillsOverlap() {
        return skillsOverlap;
    }

    public void setSkillsOverlap(List<String> skillsOverlap) {
        this.skillsOverlap = skillsOverlap;
    }

    public String getExperienceDifference() {
        return experienceDifference;
    }

    public void setExperienceDifference(String experienceDifference) {
        this.experienceDifference = experienceDifference;
    }

    public List<String> getStrengths() {
        return strengths;
    }

    public void setStrengths(List<String> strengths) {
        this.strengths = strengths;
    }

    public List<String> getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(List<String> weaknesses) {
        this.weaknesses = weaknesses;
    }
}
