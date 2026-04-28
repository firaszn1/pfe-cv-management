package com.st2i.cvfilter.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.st2i.cvfilter.dto.CandidateFilterRequest;
import com.st2i.cvfilter.dto.CandidatePageResponse;
import com.st2i.cvfilter.dto.CandidateResponse;
import com.st2i.cvfilter.dto.CandidateStatusRequest;
import com.st2i.cvfilter.dto.DashboardStatsResponse;
import com.st2i.cvfilter.dto.SmartSearchRequest;
import com.st2i.cvfilter.dto.UploadCandidateResponse;
import com.st2i.cvfilter.model.Candidate;
import com.st2i.cvfilter.service.AlfrescoDocument;
import com.st2i.cvfilter.service.CandidateExportService;
import com.st2i.cvfilter.service.CandidateService;

@RestController
@RequestMapping("/api")
public class CandidateController {

    private final CandidateService service;
    private final CandidateExportService candidateExportService;

    public CandidateController(CandidateService service, CandidateExportService candidateExportService) {
        this.service = service;
        this.candidateExportService = candidateExportService;
    }

    @PostMapping("/hr/candidates/upload")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public UploadCandidateResponse upload(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) throws IOException {
        return service.uploadCv(file);
    }

    @GetMapping("/hr/candidates")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public CandidatePageResponse getAll(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String sort
    ) {
        return service.getCandidatesPage(page, size, sort);
    }

    @GetMapping("/hr/candidates/{id}")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public CandidateResponse getById(@PathVariable String id) {
        return service.getCandidateById(id);
    }

    @GetMapping("/hr/candidates/{id}/cv/download")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public ResponseEntity<byte[]> downloadCv(@PathVariable String id) {
        AlfrescoDocument document = service.downloadOriginalCv(id, "CV_DOWNLOADED");
        return cvResponse(document, ContentDisposition.attachment()
                .filename(document.getFileName())
                .build());
    }

    @GetMapping("/hr/candidates/{id}/cv/view")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public ResponseEntity<byte[]> viewCv(@PathVariable String id) {
        AlfrescoDocument document = service.downloadOriginalCv(id, "CV_VIEWED");
        return cvResponse(document, ContentDisposition.inline()
                .filename(document.getFileName())
                .build());
    }

    @PutMapping("/hr/candidates/{id}/status")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public CandidateResponse updateStatus(@PathVariable String id, @RequestBody CandidateStatusRequest request) {
        return service.updateStatus(id, request == null ? null : request.getStatus());
    }

    @PutMapping("/hr/candidates/{id}/shortlist")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public CandidateResponse toggleShortlist(@PathVariable String id) {
        return service.toggleShortlist(id);
    }

    @GetMapping("/hr/candidates/shortlisted")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public List<CandidateResponse> shortlisted() {
        return service.getShortlistedCandidates();
    }

    @GetMapping("/hr/candidates/{id}/export")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public ResponseEntity<byte[]> exportCandidate(@PathVariable String id) {
        return pdfResponse(candidateExportService.exportCandidate(id), "candidate-" + id + ".pdf");
    }

    @GetMapping("/hr/candidates/shortlist/export")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public ResponseEntity<byte[]> exportShortlist() {
        return pdfResponse(candidateExportService.exportShortlist(), "shortlisted-candidates.pdf");
    }

    @PutMapping("/hr/candidates/{id}")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public CandidateResponse update(@PathVariable String id, @RequestBody Candidate c) {
        return service.updateCandidate(id, c);
    }

    @DeleteMapping("/admin/candidates/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable String id) {
        service.deleteCandidate(id);
    }

    @PostMapping("/hr/candidates/filter")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public List<CandidateResponse> filter(@RequestBody CandidateFilterRequest request) {
        return service.filterCandidates(request);
    }

    @PostMapping("/hr/candidates/smart-search")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public List<CandidateResponse> smartSearch(@RequestBody SmartSearchRequest request) {
        return service.smartSearch(request);
    }

    @GetMapping("/hr/dashboard/stats")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public DashboardStatsResponse stats() {
        return service.getDashboardStats();
    }

    private ResponseEntity<byte[]> cvResponse(AlfrescoDocument document, ContentDisposition disposition) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(document.getContent());
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] content, String fileName) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(content);
    }
}
