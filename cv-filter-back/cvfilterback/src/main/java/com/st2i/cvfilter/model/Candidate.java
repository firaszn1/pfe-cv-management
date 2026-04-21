package com.st2i.cvfilter.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "candidates")
public class Candidate {

    @Id
    private String id;

    private String fullName;
    private String email;
    private String phone;
    private String address;

    private List<String> skills = new ArrayList<>();
    private List<String> languages = new ArrayList<>();

    private Double yearsOfExperience;
    private String seniorityLevel;

    private String currentJobTitle;
    private String highestDegree;

    private String cvFileName;
    private String contentType;
    private String extractedText;

    private List<Double> embedding = new ArrayList<>();

    private LocalDateTime createdAt;

    public Candidate() {
    }

    public Candidate(String id, String fullName, String email, String phone, String address,
                     List<String> skills, List<String> languages, Double yearsOfExperience,
                     String seniorityLevel, String currentJobTitle, String highestDegree,
                     String cvFileName, String contentType, String extractedText,
                     List<Double> embedding, LocalDateTime createdAt) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.skills = skills != null ? skills : new ArrayList<>();
        this.languages = languages != null ? languages : new ArrayList<>();
        this.yearsOfExperience = yearsOfExperience;
        this.seniorityLevel = seniorityLevel;
        this.currentJobTitle = currentJobTitle;
        this.highestDegree = highestDegree;
        this.cvFileName = cvFileName;
        this.contentType = contentType;
        this.extractedText = extractedText;
        this.embedding = embedding != null ? embedding : new ArrayList<>();
        this.createdAt = createdAt;
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
        this.skills = skills != null ? skills : new ArrayList<>();
    }

    public List<String> getLanguages() {
        return languages;
    }

    public void setLanguages(List<String> languages) {
        this.languages = languages != null ? languages : new ArrayList<>();
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

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getExtractedText() {
        return extractedText;
    }

    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }

    public List<Double> getEmbedding() {
        return embedding;
    }

    public void setEmbedding(List<Double> embedding) {
        this.embedding = embedding != null ? embedding : new ArrayList<>();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}