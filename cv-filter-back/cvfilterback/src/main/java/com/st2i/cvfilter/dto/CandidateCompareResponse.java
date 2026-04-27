package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class CandidateCompareResponse {

    private List<CandidateResponse> candidates = new ArrayList<>();
    private CandidateComparisonDetails comparison;

    public List<CandidateResponse> getCandidates() {
        return candidates;
    }

    public void setCandidates(List<CandidateResponse> candidates) {
        this.candidates = candidates;
    }

    public CandidateComparisonDetails getComparison() {
        return comparison;
    }

    public void setComparison(CandidateComparisonDetails comparison) {
        this.comparison = comparison;
    }
}
