package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class CandidateCompareRequest {

    private List<String> candidateIds = new ArrayList<>();

    public List<String> getCandidateIds() {
        return candidateIds;
    }

    public void setCandidateIds(List<String> candidateIds) {
        this.candidateIds = candidateIds;
    }
}
