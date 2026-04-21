package com.st2i.cvfilter.dto;

public class SkillCountResponse {

    private String skill;
    private long count;

    public SkillCountResponse() {
    }

    public SkillCountResponse(String skill, long count) {
        this.skill = skill;
        this.count = count;
    }

    public String getSkill() {
        return skill;
    }

    public void setSkill(String skill) {
        this.skill = skill;
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }
}