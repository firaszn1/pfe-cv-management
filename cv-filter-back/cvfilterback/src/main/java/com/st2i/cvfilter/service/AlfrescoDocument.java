package com.st2i.cvfilter.service;

public class AlfrescoDocument {

    private final byte[] content;
    private final String fileName;
    private final String contentType;

    public AlfrescoDocument(byte[] content, String fileName, String contentType) {
        this.content = content;
        this.fileName = fileName;
        this.contentType = contentType;
    }

    public byte[] getContent() {
        return content;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }
}
