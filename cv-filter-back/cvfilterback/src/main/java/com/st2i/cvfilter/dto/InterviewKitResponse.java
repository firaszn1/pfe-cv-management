package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class InterviewKitResponse {

    private String candidateId;
    private String candidateName;
    private String seniorityLevel;
    private String jobTitle;
    private List<String> technical = new ArrayList<>();
    private List<String> project = new ArrayList<>();
    private List<String> hr = new ArrayList<>();
    private List<String> clarification = new ArrayList<>();

    public String getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(String candidateId) {
        this.candidateId = candidateId;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getSeniorityLevel() {
        return seniorityLevel;
    }

    public void setSeniorityLevel(String seniorityLevel) {
        this.seniorityLevel = seniorityLevel;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public List<String> getTechnical() {
        return technical;
    }

    public void setTechnical(List<String> technical) {
        this.technical = technical;
    }

    public List<String> getProject() {
        return project;
    }

    public void setProject(List<String> project) {
        this.project = project;
    }

    public List<String> getHr() {
        return hr;
    }

    public void setHr(List<String> hr) {
        this.hr = hr;
    }

    public List<String> getClarification() {
        return clarification;
    }

    public void setClarification(List<String> clarification) {
        this.clarification = clarification;
    }
}
