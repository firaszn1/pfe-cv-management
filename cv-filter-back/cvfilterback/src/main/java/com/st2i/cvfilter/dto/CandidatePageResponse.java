package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class CandidatePageResponse {

    private List<CandidateResponse> content = new ArrayList<>();
    private long totalElements;
    private int totalPages;
    private int currentPage;

    public CandidatePageResponse() {
    }

    public CandidatePageResponse(List<CandidateResponse> content, long totalElements, int totalPages, int currentPage) {
        this.content = content == null ? new ArrayList<>() : content;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
    }

    public List<CandidateResponse> getContent() {
        return content;
    }

    public void setContent(List<CandidateResponse> content) {
        this.content = content == null ? new ArrayList<>() : content;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public int getCurrentPage() {
        return currentPage;
    }

    public void setCurrentPage(int currentPage) {
        this.currentPage = currentPage;
    }
}
