package com.st2i.cvfilter.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import com.st2i.cvfilter.dto.CandidateCompareRequest;
import com.st2i.cvfilter.dto.CandidateCompareResponse;
import com.st2i.cvfilter.dto.JobMatchRequest;
import com.st2i.cvfilter.dto.JobMatchResponse;
import com.st2i.cvfilter.service.CandidateCompareService;
import com.st2i.cvfilter.service.CandidateService;
import com.st2i.cvfilter.service.JobMatchService;

@RestController
@RequestMapping("/api")
public class AdvancedAiController {

    private final JobMatchService jobMatchService;
    private final CandidateCompareService candidateCompareService;
    private final CandidateService candidateService;

    public AdvancedAiController(JobMatchService jobMatchService, CandidateCompareService candidateCompareService,
                                CandidateService candidateService) {
        this.jobMatchService = jobMatchService;
        this.candidateCompareService = candidateCompareService;
        this.candidateService = candidateService;
    }

    @PostMapping("/job-match")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public JobMatchResponse jobMatch(@RequestBody JobMatchRequest request) {
        return jobMatchService.match(request);
    }

    @PostMapping({"/candidates/compare", "/hr/candidates/compare"})
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public CandidateCompareResponse compare(@RequestBody CandidateCompareRequest request) {
        return candidateCompareService.compare(request);
    }

    @PostMapping("/ai/regenerate-embeddings")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public Map<String, Object> regenerateEmbeddings() {
        int regenerated = candidateService.regenerateMissingEmbeddings();
        return Map.of(
                "regenerated", regenerated,
                "message", "Regenerated missing embeddings for " + regenerated + " candidates"
        );
    }
}
