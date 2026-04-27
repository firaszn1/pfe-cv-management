package com.st2i.cvfilter.dto;

import java.time.LocalDateTime;
import java.util.List;

public class CandidateResponse {

    private String id;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private List<String> skills;
    private List<String> languages;
    private Double yearsOfExperience;
    private String seniorityLevel;
    private String currentJobTitle;
    private String highestDegree;
    private String linkedinUrl;
    private String githubUrl;
    private String portfolioUrl;
    private List<String> educationEntries;
    private List<String> experienceEntries;
    private List<String> projectEntries;
    private List<String> certifications;
    private String cvFileName;
    private String alfrescoNodeId;
    private String alfrescoFileUrl;
    private LocalDateTime createdAt;
    private Double aiMatchScore;
    private ScoreBreakdownResponse scoreBreakdown;

    public CandidateResponse() {
    }

    public CandidateResponse(
            String id,
            String fullName,
            String email,
            String phone,
            String address,
            List<String> skills,
            List<String> languages,
            Double yearsOfExperience,
            String seniorityLevel,
            String currentJobTitle,
            String highestDegree,
            String linkedinUrl,
            String githubUrl,
            String portfolioUrl,
            List<String> educationEntries,
            List<String> experienceEntries,
            List<String> projectEntries,
            List<String> certifications,
            String cvFileName,
            String alfrescoNodeId,
            String alfrescoFileUrl,
            LocalDateTime createdAt,
            Double aiMatchScore,
            ScoreBreakdownResponse scoreBreakdown
    ) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.skills = skills;
        this.languages = languages;
        this.yearsOfExperience = yearsOfExperience;
        this.seniorityLevel = seniorityLevel;
        this.currentJobTitle = currentJobTitle;
        this.highestDegree = highestDegree;
        this.linkedinUrl = linkedinUrl;
        this.githubUrl = githubUrl;
        this.portfolioUrl = portfolioUrl;
        this.educationEntries = educationEntries;
        this.experienceEntries = experienceEntries;
        this.projectEntries = projectEntries;
        this.certifications = certifications;
        this.cvFileName = cvFileName;
        this.alfrescoNodeId = alfrescoNodeId;
        this.alfrescoFileUrl = alfrescoFileUrl;
        this.createdAt = createdAt;
        this.aiMatchScore = aiMatchScore;
        this.scoreBreakdown = scoreBreakdown;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public List<String> getLanguages() {
        return languages;
    }

    public void setLanguages(List<String> languages) {
        this.languages = languages;
    }

    public Double getYearsOfExperience() {
        return yearsOfExperience;
    }

    public void setYearsOfExperience(Double yearsOfExperience) {
        this.yearsOfExperience = yearsOfExperience;
    }

    public String getSeniorityLevel() {
        return seniorityLevel;
    }

    public void setSeniorityLevel(String seniorityLevel) {
        this.seniorityLevel = seniorityLevel;
    }

    public String getCurrentJobTitle() {
        return currentJobTitle;
    }

    public void setCurrentJobTitle(String currentJobTitle) {
        this.currentJobTitle = currentJobTitle;
    }

    public String getHighestDegree() {
        return highestDegree;
    }

    public void setHighestDegree(String highestDegree) {
        this.highestDegree = highestDegree;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getPortfolioUrl() {
        return portfolioUrl;
    }

    public void setPortfolioUrl(String portfolioUrl) {
        this.portfolioUrl = portfolioUrl;
    }

    public List<String> getEducationEntries() {
        return educationEntries;
    }

    public void setEducationEntries(List<String> educationEntries) {
        this.educationEntries = educationEntries;
    }

    public List<String> getExperienceEntries() {
        return experienceEntries;
    }

    public void setExperienceEntries(List<String> experienceEntries) {
        this.experienceEntries = experienceEntries;
    }

    public List<String> getProjectEntries() {
        return projectEntries;
    }

    public void setProjectEntries(List<String> projectEntries) {
        this.projectEntries = projectEntries;
    }

    public List<String> getCertifications() {
        return certifications;
    }

    public void setCertifications(List<String> certifications) {
        this.certifications = certifications;
    }

    public String getCvFileName() {
        return cvFileName;
    }

    public void setCvFileName(String cvFileName) {
        this.cvFileName = cvFileName;
    }

    public String getAlfrescoNodeId() {
        return alfrescoNodeId;
    }

    public void setAlfrescoNodeId(String alfrescoNodeId) {
        this.alfrescoNodeId = alfrescoNodeId;
    }

    public String getAlfrescoFileUrl() {
        return alfrescoFileUrl;
    }

    public void setAlfrescoFileUrl(String alfrescoFileUrl) {
        this.alfrescoFileUrl = alfrescoFileUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Double getAiMatchScore() {
        return aiMatchScore;
    }

    public void setAiMatchScore(Double aiMatchScore) {
        this.aiMatchScore = aiMatchScore;
    }

    public ScoreBreakdownResponse getScoreBreakdown() {
        return scoreBreakdown;
    }

    public void setScoreBreakdown(ScoreBreakdownResponse scoreBreakdown) {
        this.scoreBreakdown = scoreBreakdown;
    }
}
