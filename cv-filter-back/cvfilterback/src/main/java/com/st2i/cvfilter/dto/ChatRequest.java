package com.st2i.cvfilter.dto;

public class ChatRequest {

    private String message;
    private String conversationId;
    private String selectedCandidateId;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getSelectedCandidateId() {
        return selectedCandidateId;
    }

    public void setSelectedCandidateId(String selectedCandidateId) {
        this.selectedCandidateId = selectedCandidateId;
    }
}
