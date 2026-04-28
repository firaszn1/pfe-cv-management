package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

import com.st2i.cvfilter.model.AuditLog;

public class AuditLogPageResponse {

    private List<AuditLog> content = new ArrayList<>();
    private long totalElements;
    private int totalPages;
    private int currentPage;

    public AuditLogPageResponse() {
    }

    public AuditLogPageResponse(List<AuditLog> content, long totalElements, int totalPages, int currentPage) {
        this.content = content == null ? new ArrayList<>() : content;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.currentPage = currentPage;
    }

    public List<AuditLog> getContent() {
        return content;
    }

    public void setContent(List<AuditLog> content) {
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
