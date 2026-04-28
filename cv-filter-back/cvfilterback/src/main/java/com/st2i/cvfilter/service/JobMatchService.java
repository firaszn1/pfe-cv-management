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
        String description = sanitize(request == null ? null : request.getDescription());
        if (description.length() > 12000) {
            throw new IllegalArgumentException("Job description is too long. Maximum allowed length is 12000 characters.");
        }
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

    private String sanitize(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
