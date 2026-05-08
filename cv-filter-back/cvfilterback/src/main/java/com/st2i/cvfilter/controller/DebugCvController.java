package com.st2i.cvfilter.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.st2i.cvfilter.dto.CvDebugResponse;
import com.st2i.cvfilter.service.CandidateParserService;
import com.st2i.cvfilter.service.CvTextExtractorService;

@RestController
@RequestMapping("/api/debug")
public class DebugCvController {

    private final CvTextExtractorService extractor;
    private final CandidateParserService parser;

    public DebugCvController(CvTextExtractorService extractor, CandidateParserService parser) {
        this.extractor = extractor;
        this.parser = parser;
    }

    @PostMapping(value = "/extract-cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CvDebugResponse extractCv(@RequestParam("file") MultipartFile file) throws IOException {
        String rawText;
        try {
            rawText = extractor.extractText(file);
        } catch (IllegalArgumentException e) {
            CvDebugResponse response = new CvDebugResponse();
            response.setFirstLines(List.of());
            response.setFullText("");
            response.setNormalizedText("");
            response.setPhoneCandidates(List.of());
            response.setAcceptedPhone("");
            response.setRejectedPhoneReasons(List.of());
            response.setAddressCandidates(List.of());
            response.setAcceptedAddress("");
            response.setWarnings(List.of("Extraction failed: " + e.getMessage()));
            return response;
        }

        CandidateParserService.PhoneDebugResult phoneResult = parser.debugPhone(rawText);
        CandidateParserService.AddressDebugResult addressResult = parser.debugAddress(rawText);

        List<String> warnings = new ArrayList<>();
        if (phoneResult.accepted() == null) {
            warnings.add("Phone: no candidate was accepted.");
            if (phoneResult.candidates().isEmpty()) {
                warnings.add("Phone: zero regex matches found in the extracted text; "
                        + "the number format may not match PHONE_PATTERN_TN.");
            }
        }
        if (addressResult.accepted() == null) {
            warnings.add("Address: no candidate was accepted.");
            if (!addressResult.candidates().isEmpty()) {
                warnings.add("Address: location candidates were found but rejected as non-personal or uncertain.");
            }
        }

        CvDebugResponse response = new CvDebugResponse();
        response.setFirstLines(parser.parseDebugLines(rawText, 40));
        response.setFullText(rawText);
        response.setNormalizedText(phoneResult.normalizedText());
        response.setPhoneCandidates(phoneResult.candidates());
        response.setAcceptedPhone(phoneResult.accepted() == null ? "" : phoneResult.accepted());
        response.setRejectedPhoneReasons(phoneResult.rejectedReasons());
        response.setAddressCandidates(addressResult.candidates());
        response.setAcceptedAddress(addressResult.accepted() == null ? "" : addressResult.accepted());
        response.setWarnings(warnings);
        return response;
    }
}
