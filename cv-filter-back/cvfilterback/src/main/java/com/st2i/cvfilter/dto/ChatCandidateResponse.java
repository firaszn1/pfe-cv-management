package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class ChatCandidateResponse {

    private CandidateResponse candidate;
    private String explanation;
    private List<String> reasons = new ArrayList<>();
    private List<String> strengths = new ArrayList<>();
    private List<String> weaknesses = new ArrayList<>();

    public CandidateResponse getCandidate() {
        return candidate;
    }

    public void setCandidate(CandidateResponse candidate) {
        this.candidate = candidate;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public List<String> getReasons() {
        return reasons;
    }

    public void setReasons(List<String> reasons) {
        this.reasons = reasons;
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
