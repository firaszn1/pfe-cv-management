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
    private String cvFileName;
    private LocalDateTime createdAt;
    private Double aiMatchScore;

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
            String cvFileName,
            LocalDateTime createdAt,
            Double aiMatchScore
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
        this.cvFileName = cvFileName;
        this.createdAt = createdAt;
        this.aiMatchScore = aiMatchScore;
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

    public String getCvFileName() {
        return cvFileName;
    }

    public void setCvFileName(String cvFileName) {
        this.cvFileName = cvFileName;
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
}