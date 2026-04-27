package com.st2i.cvfilter.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.st2i.cvfilter.dto.InterviewKitResponse;
import com.st2i.cvfilter.service.InterviewKitService;

@RestController
@RequestMapping("/api/interview-kit")
public class InterviewKitController {

    private final InterviewKitService interviewKitService;

    public InterviewKitController(InterviewKitService interviewKitService) {
        this.interviewKitService = interviewKitService;
    }

    @PostMapping("/{candidateId}")
    public InterviewKitResponse generate(@PathVariable String candidateId) {
        return interviewKitService.generate(candidateId);
    }
}
