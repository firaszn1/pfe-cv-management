package com.st2i.cvfilter.service;

import java.io.IOException;
import java.io.InputStream;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CvTextExtractorService {

    public String extractText(MultipartFile file) throws IOException {
        String originalFileName = file.getOriginalFilename();

        if (originalFileName == null || originalFileName.isBlank()) {
            throw new IllegalArgumentException("Invalid file name");
        }

        String lowerName = originalFileName.toLowerCase();

        if (lowerName.endsWith(".pdf")) {
            return extractFromPdf(file.getInputStream());
        }

        if (lowerName.endsWith(".docx")) {
            return extractFromDocx(file.getInputStream());
        }

        throw new IllegalArgumentException("Only PDF and DOCX files are supported");
    }

    private String extractFromPdf(InputStream inputStream) throws IOException {
        try (PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String extractFromDocx(InputStream inputStream) throws IOException {
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            StringBuilder builder = new StringBuilder();
            document.getParagraphs().forEach(p -> builder.append(p.getText()).append("\n"));
            return builder.toString();
        }
    }
}