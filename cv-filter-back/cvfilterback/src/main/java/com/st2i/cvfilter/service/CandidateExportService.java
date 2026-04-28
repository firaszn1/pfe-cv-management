package com.st2i.cvfilter.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import com.st2i.cvfilter.exception.ResourceNotFoundException;
import com.st2i.cvfilter.model.Candidate;
import com.st2i.cvfilter.repository.CandidateRepository;

@Service
public class CandidateExportService {

    private final CandidateRepository candidateRepository;

    public CandidateExportService(CandidateRepository candidateRepository) {
        this.candidateRepository = candidateRepository;
    }

    public byte[] exportCandidate(String id) {
        Candidate candidate = candidateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
        return buildPdf("Candidate Profile", List.of(candidate));
    }

    public byte[] exportShortlist() {
        return buildPdf("Shortlisted Candidates", candidateRepository.findByShortlistedTrue());
    }

    private byte[] buildPdf(String title, List<Candidate> candidates) {
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);

            PDPageContentStream content = new PDPageContentStream(document, page);
            PDType1Font titleFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font bodyFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float y = 740;

            content.beginText();
            content.setFont(titleFont, 18);
            content.newLineAtOffset(50, y);
            content.showText(safe(title));
            content.endText();
            y -= 34;

            for (Candidate candidate : candidates) {
                if (y < 120) {
                    content.close();
                    page = new PDPage();
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = 740;
                }

                y = writeLine(content, titleFont, 13, 50, y, safe(candidate.getFullName()));
                y = writeLine(content, bodyFont, 10, 62, y, "Email: " + safe(candidate.getEmail()));
                y = writeLine(content, bodyFont, 10, 62, y, "Phone: " + safe(candidate.getPhone()));
                y = writeLine(content, bodyFont, 10, 62, y, "Title: " + safe(candidate.getCurrentJobTitle()));
                y = writeLine(content, bodyFont, 10, 62, y, "Status: " + safe(candidate.getStatus()));
                y = writeLine(content, bodyFont, 10, 62, y, "Experience: " + safe(candidate.getYearsOfExperience()));
                y = writeLine(content, bodyFont, 10, 62, y, "Skills: " + safe(join(candidate.getSkills())));
                y -= 10;
            }

            content.close();
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not generate candidate export PDF", ex);
        }
    }

    private float writeLine(PDPageContentStream content, PDType1Font font, int size, float x, float y, String value)
            throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(x, y);
        content.showText(truncate(value));
        content.endText();
        return y - 16;
    }

    private String join(List<String> values) {
        return values == null || values.isEmpty() ? "" : String.join(", ", values);
    }

    private String safe(Object value) {
        return value == null ? "" : value.toString()
                .replaceAll("[\\r\\n]+", " ")
                .replaceAll("[^\\x20-\\x7E]", "?")
                .trim();
    }

    private String truncate(String value) {
        return value == null || value.length() <= 95 ? safe(value) : safe(value).substring(0, 95);
    }
}
