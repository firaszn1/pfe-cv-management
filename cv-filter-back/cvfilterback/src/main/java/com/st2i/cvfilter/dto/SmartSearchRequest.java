package com.st2i.cvfilter.dto;

public class SmartSearchRequest {

    private String query;

    public SmartSearchRequest() {
    }

    public SmartSearchRequest(String query) {
        this.query = query;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }
}