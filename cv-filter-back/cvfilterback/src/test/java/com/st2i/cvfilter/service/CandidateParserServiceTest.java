package com.st2i.cvfilter.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.st2i.cvfilter.model.Candidate;

/**
 * Unit tests for CandidateParserService.
 *
 * Tests use realistic Tunisian CV text (the exact text that the PDF/DOCX extractor
 * would produce after normalisation) to catch real-world regressions.
 */
class CandidateParserServiceTest {

    private final CandidateParserService parser = new CandidateParserService();

    // =========================================================================
    // PHONE EXTRACTION
    // =========================================================================

    @Nested
    class PhoneExtraction {

        private static final String EMBEDDED_PHONE_WITH_TITLE_AND_EMAIL =
                "Data Scientist | Machine Learning, Big Data, MLOps +216 57 123 168 souleimen.benhmida@gmail.com";

        /** Simulates the exact extracted text from a failing Tunisian CV. */
        private static final String REAL_CV_TEXT = """
                FIRAS ZNAIDI
                Développeur Full Stack
                firas.znaidi@gmail.com
                +216 24 436 061
                Maamoura, Nabeul, Tunisie
                FORMATION
                ISET Nabeul
                Licence en développement des systèmes d'information 2020 - 2023
                COMPÉTENCES
                Java Spring Boot Angular MongoDB
                LANGUES
                Français Anglais Arabe
                """;

        @Test
        void extractsPhoneFromRealCvText() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", REAL_CV_TEXT);
            assertThat(c.getPhone())
                    .as("phone must be extracted from real CV text")
                    .isEqualTo("+216 24 436 061");
        }

        @Test
        void extractsPhoneEmbeddedInJobTitleLineWithEmail() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", EMBEDDED_PHONE_WITH_TITLE_AND_EMAIL);

            assertThat(c.getPhone()).isEqualTo("+216 57 123 168");
        }

        @Test
        void debugPhoneShowsNormalizedTextCandidateAndAcceptedPhone() {
            CandidateParserService.PhoneDebugResult result = parser.debugPhone(EMBEDDED_PHONE_WITH_TITLE_AND_EMAIL);

            assertThat(result.normalizedText()).contains(EMBEDDED_PHONE_WITH_TITLE_AND_EMAIL);
            assertThat(result.candidates())
                    .anySatisfy(candidate -> assertThat(candidate)
                            .contains("normalizedText=")
                            .contains("candidate found: +216 57 123 168"));
            assertThat(result.accepted()).isEqualTo("+216 57 123 168");
        }

        @Test
        void debugLinesContainExpectedFirstLine() {
            List<String> lines = parser.parseDebugLines(REAL_CV_TEXT, 40);
            assertThat(lines).isNotEmpty();
            assertThat(lines.get(0)).isEqualTo("FIRAS ZNAIDI");
        }

        // --- All required phone formats ---

        @Test
        void format_plusInternational_spaced() {
            assertPhone("+216 24 436 061", "+216 24 436 061");
        }

        @Test
        void format_plusInternational_compact() {
            assertPhone("+21624436061", "+216 24 436 061");
        }

        @Test
        void format_00216_spaced() {
            assertPhone("00216 24 436 061", "+216 24 436 061");
        }

        @Test
        void format_00216_compact() {
            assertPhone("0021624436061", "+216 24 436 061");
        }

        @Test
        void format_bareEightDigits_spaced() {
            assertPhone("24 436 061", "+216 24 436 061");
        }

        @Test
        void format_bareEightDigits_compact() {
            assertPhone("24436061", "+216 24 436 061");
        }

        @Test
        void format_dotSeparated() {
            assertPhone("24.436.061", "+216 24 436 061");
        }

        @Test
        void format_dashSeparated() {
            assertPhone("24-436-061", "+216 24 436 061");
        }

        @Test
        void format_withTelLabel() {
            assertPhone("Tel: 24 436 061", "+216 24 436 061");
        }

        @Test
        void format_withTelephoneLabel_accented() {
            assertPhone("Téléphone: +216 24 436 061", "+216 24 436 061");
        }

        @Test
        void format_phoneAppearsInMiddleOfDocument() {
            // Phone is not in the first 10 lines
            String text = """
                    Ahmed Ben Salem
                    Développeur Java
                    ahmed@example.com
                    Tunis, Tunisia
                    FORMATION
                    Licence informatique - ISET Tunis 2018-2021
                    EXPÉRIENCE
                    Stagiaire chez ST2I
                    Janvier 2022 - Juin 2022
                    COMPÉTENCES
                    Java Spring Angular
                    CONTACT
                    Mobile: 55 123 456
                    """;
            Candidate c = parser.parse("cv.pdf", "application/pdf", text);
            assertThat(c.getPhone()).isEqualTo("+216 55 123 456");
        }

        @Test
        void rejectsDatesAsPhoneNumbers() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    À PROPOS DE MOI
                    13/05/2024
                    FORMATION
                    2020 - 2023
                    """);
            assertThat(c.getPhone()).isNull();
        }

        @Test
        void rejectsYearRangeAsPhoneNumbers() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Karim Jebali
                    karim@mail.com
                    FORMATION
                    Licence 2019-2022
                    """);
            assertThat(c.getPhone()).isNull();
        }

        @Test
        void rejectsDateOfBirthLine() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Sonia Khalil
                    sonia@mail.com
                    Date de naissance: 15/03/1999
                    Tunis
                    """);
            assertThat(c.getPhone()).isNull();
        }

        @Test
        void normalizesBareEightDigitsToE164() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Sami Trabelsi
                    Java Developer
                    sami@example.com
                    24436061
                    Tunis
                    """);
            assertThat(c.getPhone()).isEqualTo("+216 24 436 061");
        }

        // -----------------------------------------------------------------------
        private void assertPhone(String phoneInText, String expected) {
            Candidate c = parser.parse("cv.pdf", "application/pdf",
                    "Test Candidate\nDeveloper\ntest@mail.com\n" + phoneInText + "\nTunis\n");
            assertThat(c.getPhone())
                    .as("phone from '%s'", phoneInText)
                    .isEqualTo(expected);
        }
    }

    // =========================================================================
    // ADDRESS EXTRACTION
    // =========================================================================

    @Nested
    class AddressExtraction {

        @Test
        void extractsCityCountryEmbeddedInLinksLine() {
            Candidate c = parser.parse("cv.pdf", "application/pdf",
                    "linkedin.com/souleimen-ben-hmida Github.com/souleimen284 Nabeul, Tunisia");

            assertThat(c.getAddress()).isEqualTo("Nabeul, Tunisia");
        }

        @Test
        void rejectsGiftyCompanyLocationAsPersonalAddress() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", "Gifty Nabeul, Tunisia");

            assertThat(c.getAddress()).isNull();
        }

        @Test
        void rejectsFacultyLineAsPersonalAddress() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", "Faculty of Sciences of Tunis 2024 to 2027");

            assertThat(c.getAddress()).isNull();
        }

        @Test
        void extractsMaamouraNabeulTunisia() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", "Maamoura Nabeul, Tunisia");

            assertThat(c.getAddress()).isEqualTo("Maamoura Nabeul, Tunisia");
        }

        @Test
        void extractsFrenchAddressLabel() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", "Adresse: Nabeul, Tunisie");

            assertThat(c.getAddress()).isEqualTo("Nabeul, Tunisie");
        }

        @Test
        void topProfileLocationBeatsLaterCompanyLocation() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Souleimen Ben Hmida
                    souleimen.benhmida@gmail.com
                    linkedin.com/souleimen-ben-hmida Github.com/souleimen284 Nabeul, Tunisia
                    EXPERIENCE
                    Gifty Nabeul, Tunisia
                    """);

            assertThat(c.getAddress()).isEqualTo("Nabeul, Tunisia");
        }

        @Test
        void extractsAddressFromRealCvText_withCityAndCountry() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    FIRAS ZNAIDI
                    Développeur Full Stack
                    firas.znaidi@gmail.com
                    +216 24 436 061
                    Maamoura, Nabeul, Tunisie
                    FORMATION
                    ISET Nabeul
                    Licence développement 2020-2023
                    """);
            assertThat(c.getAddress())
                    .as("address should be Maamoura line, not ISET Nabeul")
                    .isEqualTo("Maamoura, Nabeul, Tunisie");
        }

        @Test
        void prefersLabeledAddressLine() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Mariem Ben Ali
                    mariem@mail.com
                    Adresse: Nabeul, Tunisia
                    FORMATION
                    ISET Nabeul
                    """);
            assertThat(c.getAddress()).isEqualTo("Nabeul, Tunisia");
        }

        @Test
        void prefersLabeledAddressLine_french() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Amine Rekik
                    amine@mail.com
                    Localisation: Sousse, Tunisie
                    FORMATION
                    Université de Sousse
                    """);
            assertThat(c.getAddress()).isEqualTo("Sousse, Tunisie");
        }

        @Test
        void rejectsIsetNameAsAddress() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Rania Chouicha
                    rania@mail.com
                    ISET Nabeul
                    Nabeul, Tunisie
                    """);
            // "ISET Nabeul" should be rejected; "Nabeul, Tunisie" should be selected
            assertThat(c.getAddress()).isEqualTo("Nabeul, Tunisie");
        }

        @Test
        void rejectsUniversityNameAsAddress() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Yassine Jaziri
                    yassine@mail.com
                    Université de Tunis El Manar
                    Tunis, Tunisie
                    """);
            assertThat(c.getAddress()).isEqualTo("Tunis, Tunisie");
        }

        @Test
        void rejectsSt2iNameAsAddress() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Lina Karoui
                    lina@mail.com
                    ST2I Sousse
                    Sousse, Tunisia
                    """);
            assertThat(c.getAddress()).isEqualTo("Sousse, Tunisia");
        }

        @Test
        void rejectsLicenceLineThatMentionsCity() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Nour Haddad
                    nour@mail.com
                    Licence en Informatique - Tunis 2022
                    Tunis, Tunisie
                    """);
            assertThat(c.getAddress()).isEqualTo("Tunis, Tunisie");
        }

        @Test
        void returnsNullWhenOnlyInstitutionLinesContainCity() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Omar Talbi
                    omar@mail.com
                    ISET Nabeul - Licence développement 2019-2022
                    Institut Supérieur Nabeul
                    """);
            // Both lines are institution names; address should be null or empty
            assertThat(c.getAddress()).isNull();
        }

        @Test
        void extractsBareCityWhenNothingElseAvailable() {
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Sana Gharbi
                    sana@mail.com
                    +216 92 000 001
                    Sfax
                    Java Spring Boot
                    """);
            assertThat(c.getAddress()).isEqualTo("Sfax");
        }

        @Test
        void ignoresCityInLongDescriptionLine() {
            // A line longer than 50 chars mentioning a city should not be picked up as address
            Candidate c = parser.parse("cv.pdf", "application/pdf", """
                    Bilel Mansour
                    bilel@mail.com
                    Développeur passionné basé à Tunis avec 3 ans d'expérience
                    """);
            // The description line is >50 chars; it should be skipped; no valid address
            assertThat(c.getAddress()).isNull();
        }
    }

    // =========================================================================
    // EXISTING TESTS (kept intact)
    // =========================================================================

    @Test
    void sectionTitleDoesNotBecomeName() {
        Candidate candidate = parser.parse("cv.pdf", "application/pdf", """
                À PROPOS DE MOI
                Développeur passionné par Java et Angular.
                FORMATION
                Licence informatique
                """);

        assertThat(candidate.getFullName()).isEqualTo("Unknown");
    }

    @Test
    void longProfileSummaryDoesNotBecomeJobTitle() {
        Candidate candidate = parser.parse("cv.pdf", "application/pdf", """
                Ahmed Mansour
                Je suis un développeur passionné avec une forte capacité à travailler en équipe sur des projets complexes.
                ahmed@example.com
                """);

        assertThat(candidate.getCurrentJobTitle()).isNull();
    }

    @Test
    void studentCvDoesNotInferSeniorExperienceFromEducationDates() {
        Candidate candidate = parser.parse("cv.pdf", "application/pdf", """
                Lina Karoui
                Étudiant IT
                lina@example.com
                FORMATION
                Licence informatique 2020 - 2023
                Projet Node MySQL
                """);

        assertThat(candidate.getYearsOfExperience()).isEqualTo(0.0);
        assertThat(candidate.getSeniorityLevel()).isEqualTo("Junior");
    }

    @Test
    void normalizesFrenchEnglishArabicLanguages() {
        Candidate candidate = parser.parse("cv.pdf", "application/pdf", """
                Nour Haddad
                Frontend Developer
                Langues: français, anglais, arabe
                """);

        assertThat(candidate.getLanguages()).containsExactly("English", "French", "Arabic");
    }
}
