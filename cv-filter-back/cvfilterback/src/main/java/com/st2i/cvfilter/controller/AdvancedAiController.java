package com.st2i.cvfilter.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.st2i.cvfilter.dto.CandidateCompareRequest;
import com.st2i.cvfilter.dto.CandidateCompareResponse;
import com.st2i.cvfilter.dto.JobMatchRequest;
import com.st2i.cvfilter.dto.JobMatchResponse;
import com.st2i.cvfilter.service.CandidateCompareService;
import com.st2i.cvfilter.service.JobMatchService;

@RestController
@RequestMapping("/api")
public class AdvancedAiController {

    private final JobMatchService jobMatchService;
    private final CandidateCompareService candidateCompareService;

    public AdvancedAiController(JobMatchService jobMatchService, CandidateCompareService candidateCompareService) {
        this.jobMatchService = jobMatchService;
        this.candidateCompareService = candidateCompareService;
    }

    @PostMapping("/job-match")
    public JobMatchResponse jobMatch(@RequestBody JobMatchRequest request) {
        return jobMatchService.match(request);
    }

    @PostMapping("/candidates/compare")
    public CandidateCompareResponse compare(@RequestBody CandidateCompareRequest request) {
        return candidateCompareService.compare(request);
    }
}
