package com.st2i.cvfilter.dto;

import java.util.List;

public class DashboardStatsResponse {

    private long totalCandidates;
    private long juniorCount;
    private long midCount;
    private long seniorCount;
    private List<SkillCountResponse> topSkills;

    public DashboardStatsResponse() {
    }

    public DashboardStatsResponse(long totalCandidates, long juniorCount, long midCount, long seniorCount,
                                  List<SkillCountResponse> topSkills) {
        this.totalCandidates = totalCandidates;
        this.juniorCount = juniorCount;
        this.midCount = midCount;
        this.seniorCount = seniorCount;
        this.topSkills = topSkills;
    }

    public long getTotalCandidates() {
        return totalCandidates;
    }

    public void setTotalCandidates(long totalCandidates) {
        this.totalCandidates = totalCandidates;
    }

    public long getJuniorCount() {
        return juniorCount;
    }

    public void setJuniorCount(long juniorCount) {
        this.juniorCount = juniorCount;
    }

    public long getMidCount() {
        return midCount;
    }

    public void setMidCount(long midCount) {
        this.midCount = midCount;
    }

    public long getSeniorCount() {
        return seniorCount;
    }

    public void setSeniorCount(long seniorCount) {
        this.seniorCount = seniorCount;
    }

    public List<SkillCountResponse> getTopSkills() {
        return topSkills;
    }

    public void setTopSkills(List<SkillCountResponse> topSkills) {
        this.topSkills = topSkills;
    }
}