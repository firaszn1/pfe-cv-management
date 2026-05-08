package com.st2i.cvfilter.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({
        "firstLines",
        "fullText",
        "normalizedText",
        "phoneCandidates",
        "acceptedPhone",
        "rejectedPhoneReasons",
        "addressCandidates",
        "acceptedAddress",
        "warnings"
})
public class CvDebugResponse {

    private List<String> firstLines;
    private String fullText;
    private String normalizedText;
    private List<String> phoneCandidates;
    private String acceptedPhone;
    private List<String> rejectedPhoneReasons;
    private List<String> addressCandidates;
    private String acceptedAddress;
    private List<String> warnings;

    public List<String> getFirstLines() {
        return firstLines;
    }

    public void setFirstLines(List<String> firstLines) {
        this.firstLines = firstLines;
    }

    public String getFullText() {
        return fullText;
    }

    public void setFullText(String fullText) {
        this.fullText = fullText;
    }

    public String getNormalizedText() {
        return normalizedText;
    }

    public void setNormalizedText(String normalizedText) {
        this.normalizedText = normalizedText;
    }

    public List<String> getPhoneCandidates() {
        return phoneCandidates;
    }

    public void setPhoneCandidates(List<String> phoneCandidates) {
        this.phoneCandidates = phoneCandidates;
    }

    public String getAcceptedPhone() {
        return acceptedPhone;
    }

    public void setAcceptedPhone(String acceptedPhone) {
        this.acceptedPhone = acceptedPhone;
    }

    public List<String> getRejectedPhoneReasons() {
        return rejectedPhoneReasons;
    }

    public void setRejectedPhoneReasons(List<String> rejectedPhoneReasons) {
        this.rejectedPhoneReasons = rejectedPhoneReasons;
    }

    public List<String> getAddressCandidates() {
        return addressCandidates;
    }

    public void setAddressCandidates(List<String> addressCandidates) {
        this.addressCandidates = addressCandidates;
    }

    public String getAcceptedAddress() {
        return acceptedAddress;
    }

    public void setAcceptedAddress(String acceptedAddress) {
        this.acceptedAddress = acceptedAddress;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings;
    }
}
