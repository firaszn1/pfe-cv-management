package com.st2i.cvfilter.service;

import java.io.IOException;
import java.util.Map;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import com.st2i.cvfilter.config.AlfrescoProperties;
import com.st2i.cvfilter.exception.AlfrescoStorageException;

@Service
public class AlfrescoService {

    private final AlfrescoProperties properties;
    private final RestClient restClient;

    public AlfrescoService(AlfrescoProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder()
                .baseUrl(trimTrailingSlash(properties.getBaseUrl()))
                .defaultHeaders(headers -> headers.setBasicAuth(properties.getUsername(), properties.getPassword()))
                .build();
    }

    public String uploadFile(MultipartFile file) throws IOException {
        String fileName = file.getOriginalFilename() == null ? "cv-document" : file.getOriginalFilename();
        ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return fileName;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("filedata", fileResource);
        body.add("name", fileName);
        body.add("nodeType", "cm:content");
        body.add("autoRename", "true");

        try {
            Map<?, ?> response = restClient.post()
                    .uri("/alfresco/api/-default-/public/alfresco/versions/1/nodes/{folderId}/children",
                            properties.getFolderId())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            String nodeId = extractNodeId(response);
            if (nodeId == null || nodeId.isBlank()) {
                throw new AlfrescoStorageException("Alfresco upload response did not include a node id", null);
            }
            return nodeId;
        } catch (AlfrescoStorageException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AlfrescoStorageException(
                    "Could not upload the original CV to Alfresco at " + trimTrailingSlash(properties.getBaseUrl())
                            + ". Start Alfresco, check ALFRESCO_BASE_URL, and verify Alfresco credentials/folder access.",
                    ex
            );
        }
    }

    public AlfrescoDocument downloadFile(String nodeId, String fallbackFileName, String fallbackContentType) {
        byte[] content;
        try {
            content = restClient.get()
                    .uri("/alfresco/api/-default-/public/alfresco/versions/1/nodes/{nodeId}/content", nodeId)
                    .retrieve()
                    .body(byte[].class);
        } catch (RestClientException ex) {
            throw new AlfrescoStorageException(
                    "Could not download the original CV from Alfresco. Check Alfresco availability and credentials.",
                    ex
            );
        }

        return new AlfrescoDocument(
                content == null ? new byte[0] : content,
                fallbackFileName == null || fallbackFileName.isBlank() ? "cv-document" : fallbackFileName,
                fallbackContentType == null || fallbackContentType.isBlank()
                        ? MediaType.APPLICATION_OCTET_STREAM_VALUE
                        : fallbackContentType
        );
    }

    private String extractNodeId(Map<?, ?> response) {
        if (response == null) {
            return null;
        }

        Object entry = response.get("entry");
        if (entry instanceof Map<?, ?> entryMap) {
            Object id = entryMap.get("id");
            return id == null ? null : id.toString();
        }

        Object id = response.get("id");
        return id == null ? null : id.toString();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
