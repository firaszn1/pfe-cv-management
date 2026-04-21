package com.st2i.cvfilter.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.st2i.cvfilter.dto.CandidateFilterRequest;
import com.st2i.cvfilter.dto.CandidateResponse;
import com.st2i.cvfilter.dto.DashboardStatsResponse;
import com.st2i.cvfilter.dto.SmartSearchRequest;
import com.st2i.cvfilter.dto.UploadCandidateResponse;
import com.st2i.cvfilter.model.Candidate;
import com.st2i.cvfilter.service.CandidateService;

@RestController
@RequestMapping("/api")
public class CandidateController {

    private final CandidateService service;

    public CandidateController(CandidateService service) {
        this.service = service;
    }

    @PostMapping("/hr/candidates/upload")
    public UploadCandidateResponse upload(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) throws IOException {
        return service.uploadCv(file);
    }

    @GetMapping("/hr/candidates")
    public List<CandidateResponse> getAll() {
        return service.getAllCandidates();
    }

    @GetMapping("/hr/candidates/{id}")
    public CandidateResponse getById(@PathVariable String id) {
        return service.getCandidateById(id);
    }

    @PutMapping("/hr/candidates/{id}")
    public CandidateResponse update(@PathVariable String id, @RequestBody Candidate c) {
        return service.updateCandidate(id, c);
    }

    @DeleteMapping("/admin/candidates/{id}")
    public void delete(@PathVariable String id) {
        service.deleteCandidate(id);
    }

    @PostMapping("/hr/candidates/filter")
    public List<CandidateResponse> filter(@RequestBody CandidateFilterRequest request) {
        return service.filterCandidates(request);
    }

    @PostMapping("/hr/candidates/smart-search")
    public List<CandidateResponse> smartSearch(@RequestBody SmartSearchRequest request) {
        return service.smartSearch(request);
    }

    @GetMapping("/hr/dashboard/stats")
    public DashboardStatsResponse stats() {
        return service.getDashboardStats();
    }
}