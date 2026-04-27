package com.st2i.cvfilter.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.st2i.cvfilter.dto.JobMatchRequest;
import com.st2i.cvfilter.dto.JobMatchResponse;
import com.st2i.cvfilter.dto.SmartSearchRequest;
import com.st2i.cvfilter.service.CandidateScoringService.QuerySignals;

@Service
public class JobMatchService {

    private final CandidateService candidateService;
    private final CandidateScoringService candidateScoringService;

    public JobMatchService(CandidateService candidateService, CandidateScoringService candidateScoringService) {
        this.candidateService = candidateService;
        this.candidateScoringService = candidateScoringService;
    }

    public JobMatchResponse match(JobMatchRequest request) {
        String description = request == null || request.getDescription() == null ? "" : request.getDescription();
        QuerySignals signals = candidateScoringService.extractSignals(description);

        JobMatchResponse response = new JobMatchResponse();
        response.setExtractedSkills(signals.getSkills());
        response.setSeniority(signals.getSeniority());
        response.setKeywords(signals.getKeywords());
        response.setCandidates(description.isBlank()
                ? List.of()
                : candidateService.smartSearch(new SmartSearchRequest(description)));
        return response;
    }
}
