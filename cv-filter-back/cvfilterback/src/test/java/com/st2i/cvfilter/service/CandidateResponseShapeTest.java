package com.st2i.cvfilter.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.st2i.cvfilter.dto.CandidatePageResponse;
import com.st2i.cvfilter.dto.CandidateResponse;
import com.st2i.cvfilter.model.Candidate;
import com.st2i.cvfilter.repository.CandidateRepository;

class CandidateResponseShapeTest {

    @Test
    void getAllCandidatesReturnsUiSafeCandidateShape() {
        Candidate candidate = new Candidate();
        candidate.setId("candidate-1");
        candidate.setFullName("Jane Doe");
        candidate.setEmail("jane@example.com");
        candidate.setPhone("+216 11 222 333");
        candidate.setAddress("Tunis");
        candidate.setSkills(null);
        candidate.setLanguages(null);
        candidate.setEducationEntries(null);
        candidate.setExperienceEntries(null);
        candidate.setProjectEntries(null);
        candidate.setCertifications(null);
        candidate.setParsingWarnings(null);
        candidate.setStatus(null);
        candidate.setShortlisted(null);
        candidate.setCvFileName("jane.pdf");
        candidate.setAlfrescoNodeId("alf-node-1");

        CandidateRepository candidateRepository = mock(CandidateRepository.class);
        when(candidateRepository.findAll()).thenReturn(List.of(candidate));

        CandidateService service = new CandidateService(
                candidateRepository,
                mock(CvTextExtractorService.class),
                mock(CandidateParserService.class),
                mock(OllamaEmbeddingService.class),
                mock(CandidateScoringService.class),
                mock(AlfrescoService.class),
                mock(AuditLogService.class)
        );

        CandidateResponse response = service.getAllCandidates().getFirst();

        assertThat(response.getFullName()).isEqualTo("Jane Doe");
        assertThat(response.getEmail()).isEqualTo("jane@example.com");
        assertThat(response.getPhone()).isEqualTo("+216 11 222 333");
        assertThat(response.getAddress()).isEqualTo("Tunis");
        assertThat(response.getSkills()).isEmpty();
        assertThat(response.getLanguages()).isEmpty();
        assertThat(response.getEducationEntries()).isEmpty();
        assertThat(response.getExperienceEntries()).isEmpty();
        assertThat(response.getProjectEntries()).isEmpty();
        assertThat(response.getCertifications()).isEmpty();
        assertThat(response.getParsingWarnings()).containsExactly("Missing current job title", "Missing skills");
        assertThat(response.getStatus()).isEqualTo("NEW");
        assertThat(response.getShortlisted()).isFalse();
        assertThat(response.getAiMatchScore()).isNull();
        assertThat(response.getScoreBreakdown()).isNull();
        assertThat(response.getCvFileName()).isEqualTo("jane.pdf");
        assertThat(response.getAlfrescoNodeId()).isEqualTo("alf-node-1");
    }

    @Test
    void getCandidatesPageReturnsExpectedPaginationEnvelope() {
        Candidate candidate = new Candidate();
        candidate.setId("candidate-1");
        candidate.setFullName("Jane Doe");
        candidate.setSkills(List.of("Java"));
        candidate.setCvFileName("jane.pdf");

        CandidateRepository candidateRepository = mock(CandidateRepository.class);
        when(candidateRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(candidate), PageRequest.of(0, 10), 1));

        CandidateService service = new CandidateService(
                candidateRepository,
                mock(CvTextExtractorService.class),
                mock(CandidateParserService.class),
                mock(OllamaEmbeddingService.class),
                mock(CandidateScoringService.class),
                mock(AlfrescoService.class),
                mock(AuditLogService.class)
        );

        CandidatePageResponse response = service.getCandidatesPage(0, 10, null);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getTotalElements()).isEqualTo(1);
        assertThat(response.getTotalPages()).isEqualTo(1);
        assertThat(response.getCurrentPage()).isZero();
    }

    @Test
    void getCandidatesPageClampsOverflowToLastPage() {
        Candidate candidate = new Candidate();
        candidate.setId("candidate-2");
        candidate.setFullName("John Doe");
        candidate.setSkills(List.of("Angular"));

        CandidateRepository candidateRepository = mock(CandidateRepository.class);
        when(candidateRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(5, 10), 11))
                .thenReturn(new PageImpl<>(List.of(candidate), PageRequest.of(1, 10), 11));

        CandidateService service = new CandidateService(
                candidateRepository,
                mock(CvTextExtractorService.class),
                mock(CandidateParserService.class),
                mock(OllamaEmbeddingService.class),
                mock(CandidateScoringService.class),
                mock(AlfrescoService.class),
                mock(AuditLogService.class)
        );

        CandidatePageResponse response = service.getCandidatesPage(5, 10, null);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getTotalElements()).isEqualTo(11);
        assertThat(response.getTotalPages()).isEqualTo(2);
        assertThat(response.getCurrentPage()).isEqualTo(1);
    }
}
