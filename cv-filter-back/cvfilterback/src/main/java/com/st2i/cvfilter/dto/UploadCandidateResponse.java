package com.st2i.cvfilter.dto;

public class UploadCandidateResponse {

    private String candidateId;
    private String fileName;
    private String message;

    public UploadCandidateResponse() {
    }

    public UploadCandidateResponse(String candidateId, String fileName, String message) {
        this.candidateId = candidateId;
        this.fileName = fileName;
        this.message = message;
    }

    public String getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(String candidateId) {
        this.candidateId = candidateId;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}