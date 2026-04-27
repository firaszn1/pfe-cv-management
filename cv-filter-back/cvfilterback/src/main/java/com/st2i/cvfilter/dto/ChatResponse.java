package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class ChatResponse {

    private String conversationId;
    private String intent;
    private String message;
    private String explanation;
    private ChatCandidateResponse topCandidate;
    private List<ChatCandidateResponse> candidates = new ArrayList<>();

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getIntent() {
        return intent;
    }

    public void setIntent(String intent) {
        this.intent = intent;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public ChatCandidateResponse getTopCandidate() {
        return topCandidate;
    }

    public void setTopCandidate(ChatCandidateResponse topCandidate) {
        this.topCandidate = topCandidate;
    }

    public List<ChatCandidateResponse> getCandidates() {
        return candidates;
    }

    public void setCandidates(List<ChatCandidateResponse> candidates) {
        this.candidates = candidates;
    }
}
