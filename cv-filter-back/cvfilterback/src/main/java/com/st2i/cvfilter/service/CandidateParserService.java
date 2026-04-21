package com.st2i.cvfilter.service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.st2i.cvfilter.model.Candidate;

@Service
public class CandidateParserService {

    private static final List<String> KNOWN_SKILLS = List.of(
            "java", "spring", "spring boot", "angular", "mongodb", "mysql", "sql",
            "javascript", "typescript", "html", "css", "python", "react",
            "node", "node.js", "docker", "git", "keycloak", "rest", "rest api",
            "hibernate", "jpa", "php", "laravel", "symfony", "bootstrap",
            "tailwind", "kubernetes", "jenkins", "aws", "azure", "linux", "postman",
            "c", "c++", "c#", ".net", "figma", "uml", "maven", "gradle", "javafx"
    );

    private static final List<String> KNOWN_LANGUAGES = List.of(
            "english", "french", "arabic", "german", "spanish", "italian"
    );

    private static final List<String> LOCATION_KEYWORDS = List.of(
            "tunisia", "tunis", "nabeul", "sousse", "sfax", "ariana", "ben arous",
            "manouba", "monastir", "mahdia", "bizerte", "gabes", "medenine",
            "kairouan", "beja", "kef", "zaghouan", "tozeur", "gafsa", "jendouba",
            "maamoura", "beni khiar", "hammamet", "korba", "kelibia", "kelibia"
    );

    public Candidate parse(String fileName, String contentType, String text) {
        String cleanText = normalizeText(text);

        String fullName = extractName(cleanText);
        String email = extractEmail(cleanText);
        String phone = extractPhone(cleanText);
        String address = extractAddress(cleanText);
        String jobTitle = extractCurrentJobTitle(cleanText, fullName);
        Double years = extractYearsOfExperience(cleanText);

        Candidate candidate = new Candidate();
        candidate.setFullName(fullName);
        candidate.setEmail(email);
        candidate.setPhone(phone);
        candidate.setAddress(address);
        candidate.setSkills(extractSkills(cleanText));
        candidate.setLanguages(extractLanguages(cleanText));
        candidate.setYearsOfExperience(years);
        candidate.setSeniorityLevel(determineSeniority(years));
        candidate.setCurrentJobTitle(jobTitle);
        candidate.setHighestDegree(extractHighestDegree(cleanText));
        candidate.setCvFileName(fileName);
        candidate.setContentType(contentType);
        candidate.setExtractedText(cleanText);
        candidate.setCreatedAt(LocalDateTime.now());

        return candidate;
    }

    private String normalizeText(String text) {
        if (text == null) {
            return "";
        }

        return text
                .replace("\r", "\n")
                .replaceAll("[\\t ]+", " ")
                .replaceAll("\\n{2,}", "\n")
                .trim();
    }

    private String normalizeForComparison(String value) {
        if (value == null) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return normalized.toLowerCase(Locale.ROOT).trim();
    }

    private String extractName(String text) {
        String[] lines = text.split("\\R");

        // 1) Strong preference: uppercase full name anywhere in first 40 lines
        for (int i = 0; i < Math.min(lines.length, 40); i++) {
            String line = sanitizeLine(lines[i]);

            if (!isStrongUppercaseNameCandidate(line)) {
                continue;
            }

            return toProperCase(line);
        }

        // 2) Fallback: normal name candidate anywhere in first 40 lines
        for (int i = 0; i < Math.min(lines.length, 40); i++) {
            String line = sanitizeLine(lines[i]);

            if (!isValidNameCandidate(line)) {
                continue;
            }

            return toProperCase(line);
        }

        return "Unknown";
    }

    private boolean isStrongUppercaseNameCandidate(String line) {
        if (line == null || line.isBlank()) {
            return false;
        }

        String normalized = normalizeForComparison(line);

        if (isNoiseHeading(normalized) || containsEducationKeywords(normalized)) {
            return false;
        }

        if (line.contains("@") || line.matches(".*\\d.*")) {
            return false;
        }

        if (line.length() < 5 || line.length() > 35) {
            return false;
        }

        String[] words = line.split("\\s+");
        if (words.length < 2 || words.length > 4) {
            return false;
        }

        boolean allWordsValid = true;
        for (String word : words) {
            if (!word.matches("[A-Za-zÀ-ÿ'\\-]+")) {
                allWordsValid = false;
                break;
            }
        }

        if (!allWordsValid) {
            return false;
        }

        return line.equals(line.toUpperCase(Locale.ROOT));
    }

    private boolean isValidNameCandidate(String line) {
        if (line == null || line.isBlank()) {
            return false;
        }

        String normalized = normalizeForComparison(line);

        if (isNoiseHeading(normalized) || containsEducationKeywords(normalized)) {
            return false;
        }

        if (line.contains("@") || line.matches(".*\\d.*")) {
            return false;
        }

        if (containsMonth(normalized)) {
            return false;
        }

        if (line.length() < 5 || line.length() > 35) {
            return false;
        }

        String[] words = line.split("\\s+");
        if (words.length < 2 || words.length > 4) {
            return false;
        }

        for (String word : words) {
            if (!word.matches("[A-Za-zÀ-ÿ'\\-]+")) {
                return false;
            }
        }

        return true;
    }

    private String extractEmail(String text) {
        Matcher matcher = Pattern.compile("[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}")
                .matcher(text);
        return matcher.find() ? matcher.group() : null;
    }

    private String extractPhone(String text) {
        String[] lines = text.split("\\R");

        for (String rawLine : lines) {
            String line = sanitizeLine(rawLine);
            String normalized = normalizeForComparison(line);

            if (line.isBlank()) {
                continue;
            }

            if (containsMonth(normalized) || normalized.contains("date") || normalized.contains("birth")) {
                continue;
            }

            Matcher matcher = Pattern.compile("(\\+?\\d[\\d\\s\\-()]{7,18}\\d)").matcher(line);

            while (matcher.find()) {
                String candidate = matcher.group(1).trim();
                String digitsOnly = candidate.replaceAll("\\D", "");

                if (digitsOnly.length() < 8 || digitsOnly.length() > 15) {
                    continue;
                }

                if (looksLikeDate(candidate)) {
                    continue;
                }

                return candidate;
            }
        }

        return null;
    }

    private String extractAddress(String text) {
        String[] lines = text.split("\\R");

        for (String rawLine : lines) {
            String line = sanitizeLine(rawLine);
            String normalized = normalizeForComparison(line);

            if (line.isBlank()) {
                continue;
            }

            boolean hasLocationKeyword = false;
            for (String keyword : LOCATION_KEYWORDS) {
                if (normalized.contains(keyword)) {
                    hasLocationKeyword = true;
                    break;
                }
            }

            if (!hasLocationKeyword) {
                continue;
            }

            if (normalized.contains("iset")
                    || normalized.contains("lycee")
                    || normalized.contains("universite")
                    || normalized.contains("university")
                    || normalized.contains("education")
                    || normalized.contains("baccalaureat")
                    || normalized.contains("licence")) {
                continue;
            }

            line = line.replaceFirst("^\\+?\\d[\\d\\s\\-()]{7,18}\\d\\s*", "").trim();
            line = line.replaceFirst("[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\s*", "").trim();

            if (!line.isBlank()) {
                return line;
            }
        }

        return null;
    }

    private List<String> extractSkills(String text) {
        String normalized = normalizeForComparison(text);
        Set<String> foundSkills = new LinkedHashSet<>();

        for (String skill : KNOWN_SKILLS) {
            if (normalized.contains(normalizeForComparison(skill))) {
                foundSkills.add(formatWord(skill));
            }
        }

        return new ArrayList<>(foundSkills);
    }

    private List<String> extractLanguages(String text) {
        String normalized = normalizeForComparison(text);
        Set<String> foundLanguages = new LinkedHashSet<>();

        for (String language : KNOWN_LANGUAGES) {
            if (normalized.contains(normalizeForComparison(language))) {
                foundLanguages.add(formatLanguage(language));
            }
        }

        return new ArrayList<>(foundLanguages);
    }

    private Double extractYearsOfExperience(String text) {
        String normalized = normalizeForComparison(text);

        Matcher monthMatcher = Pattern.compile("(\\d+)\\s*(mois|months|month)").matcher(normalized);
        if (monthMatcher.find()) {
            int months = Integer.parseInt(monthMatcher.group(1));
            return Math.round((months / 12.0) * 10.0) / 10.0;
        }

        Matcher yearsMatcher = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*(years|year|ans|an)")
                .matcher(normalized);
        if (yearsMatcher.find()) {
            return Double.parseDouble(yearsMatcher.group(1));
        }

        String experienceSection = extractExperienceSection(normalized);

        if (experienceSection != null && !experienceSection.isBlank()) {
            List<Integer> yearsFound = new ArrayList<>();
            Matcher yearMatcher = Pattern.compile("\\b(20\\d{2})\\b").matcher(experienceSection);

            while (yearMatcher.find()) {
                int year = Integer.parseInt(yearMatcher.group(1));
                yearsFound.add(year);
            }

            if (!yearsFound.isEmpty()) {
                int minYear = yearsFound.stream().min(Integer::compareTo).orElse(Year.now().getValue());
                int currentYear = Year.now().getValue();

                if (minYear >= 2000 && minYear <= currentYear) {
                    int estimated = currentYear - minYear;
                    return (double) Math.max(0, Math.min(estimated, 5));
                }
            }
        }

        return 0.0;
    }

    private String extractExperienceSection(String normalizedText) {
        int start = -1;

        if (normalizedText.contains("experience et projets")) {
            start = normalizedText.indexOf("experience et projets");
        } else if (normalizedText.contains("experience")) {
            start = normalizedText.indexOf("experience");
        }

        if (start == -1) {
            return normalizedText;
        }

        int end = normalizedText.length();

        int skillsIndex = normalizedText.indexOf("competences", start);
        if (skillsIndex != -1) {
            end = Math.min(end, skillsIndex);
        }

        int educationIndex = normalizedText.indexOf("education", start);
        if (educationIndex != -1 && educationIndex > start) {
            end = Math.min(end, educationIndex);
        }

        return normalizedText.substring(start, end);
    }

    private String determineSeniority(Double years) {
        if (years == null) {
            return "Unknown";
        }
        if (years <= 2) {
            return "Junior";
        }
        if (years <= 5) {
            return "Mid";
        }
        return "Senior";
    }

    private String extractCurrentJobTitle(String text, String fullName) {
        String[] lines = text.split("\\R");
        String normalizedName = normalizeForComparison(fullName);

        // 1) Prefer line right after name
        if (!normalizedName.equals("unknown")) {
            for (int i = 0; i < Math.min(lines.length, 40); i++) {
                String line = sanitizeLine(lines[i]);

                if (!normalizeForComparison(line).equals(normalizedName)) {
                    continue;
                }

                for (int j = i + 1; j < Math.min(lines.length, i + 6); j++) {
                    String candidateTitle = sanitizeLine(lines[j]);
                    String normalizedCandidate = normalizeForComparison(candidateTitle);

                    if (isValidTitleCandidate(candidateTitle, normalizedCandidate)) {
                        return candidateTitle;
                    }
                }
            }
        }

        // 2) fallback: short valid title anywhere in first 25 lines
        for (int i = 0; i < Math.min(lines.length, 25); i++) {
            String line = sanitizeLine(lines[i]);
            String normalized = normalizeForComparison(line);

            if (isValidTitleCandidate(line, normalized)) {
                return line;
            }
        }

        return null;
    }

    private boolean isValidTitleCandidate(String line, String normalized) {
        if (line == null || line.isBlank()) {
            return false;
        }

        if (isNoiseHeading(normalized) || containsEducationKeywords(normalized)) {
            return false;
        }

        if (line.contains("@")) {
            return false;
        }

        if (line.length() < 5 || line.length() > 80) {
            return false;
        }

        String[] words = line.split("\\s+");
        if (words.length > 10) {
            return false;
        }

        return normalized.contains("developer")
                || normalized.contains("engineer")
                || normalized.contains("intern")
                || normalized.contains("stage")
                || normalized.contains("student")
                || normalized.contains("etudiant")
                || normalized.contains("developpement")
                || normalized.contains("web")
                || normalized.contains("it");
    }

    private String extractHighestDegree(String text) {
        String normalized = normalizeForComparison(text);

        if (normalized.contains("phd") || normalized.contains("doctorate")) return "PhD";
        if (normalized.contains("master") || normalized.contains("mastere")) return "Master";
        if (normalized.contains("engineer") || normalized.contains("engineering")) return "Engineer";
        if (normalized.contains("licence")) return "Licence";
        if (normalized.contains("bachelor")) return "Bachelor";
        if (normalized.contains("technician")) return "Technician";
        if (normalized.contains("technologue")) return "Technologue";

        return null;
    }

    private boolean looksLikeDate(String value) {
        String normalized = normalizeForComparison(value);

        if (value.matches(".*\\b(19|20)\\d{2}\\b.*")) {
            return true;
        }

        if (value.matches(".*\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}.*")) {
            return true;
        }

        return containsMonth(normalized);
    }

    private boolean containsMonth(String normalizedText) {
        return normalizedText.contains("jan")
                || normalizedText.contains("feb")
                || normalizedText.contains("mar")
                || normalizedText.contains("apr")
                || normalizedText.contains("may")
                || normalizedText.contains("jun")
                || normalizedText.contains("jul")
                || normalizedText.contains("aug")
                || normalizedText.contains("sep")
                || normalizedText.contains("oct")
                || normalizedText.contains("nov")
                || normalizedText.contains("dec")
                || normalizedText.contains("janvier")
                || normalizedText.contains("fevrier")
                || normalizedText.contains("mars")
                || normalizedText.contains("avril")
                || normalizedText.contains("mai")
                || normalizedText.contains("juin")
                || normalizedText.contains("juillet")
                || normalizedText.contains("aout")
                || normalizedText.contains("septembre")
                || normalizedText.contains("octobre")
                || normalizedText.contains("novembre")
                || normalizedText.contains("decembre");
    }

    private boolean isNoiseHeading(String normalized) {
        return normalized.contains("a propos de moi")
                || normalized.contains("curriculum vitae")
                || normalized.equals("cv")
                || normalized.contains("education")
                || normalized.contains("competences")
                || normalized.contains("skills")
                || normalized.contains("experience")
                || normalized.contains("clubs")
                || normalized.contains("recompenses")
                || normalized.contains("profile")
                || normalized.contains("summary")
                || normalized.contains("modules")
                || normalized.contains("projets")
                || normalized.contains("personal information");
    }

    private boolean containsEducationKeywords(String normalized) {
        return normalized.contains("baccalaureat")
                || normalized.contains("licence")
                || normalized.contains("master")
                || normalized.contains("education")
                || normalized.contains("informatique")
                || normalized.contains("specialite")
                || normalized.contains("developpement des systemes")
                || normalized.contains("lycee")
                || normalized.contains("iset");
    }

    private String sanitizeLine(String line) {
        if (line == null) {
            return "";
        }

        return line.trim()
                .replaceAll("\\s{2,}", " ")
                .replaceAll("^[•\\-–—]+", "")
                .trim();
    }

    private String toProperCase(String value) {
        String[] parts = value.toLowerCase(Locale.ROOT).split("\\s+");
        StringBuilder result = new StringBuilder();

        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }

            if (!result.isEmpty()) {
                result.append(" ");
            }

            result.append(Character.toUpperCase(part.charAt(0)))
                  .append(part.substring(1));
        }

        return result.toString();
    }

    private String formatWord(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }

        if (value.equalsIgnoreCase("html")) return "HTML";
        if (value.equalsIgnoreCase("css")) return "CSS";
        if (value.equalsIgnoreCase("sql")) return "SQL";
        if (value.equalsIgnoreCase("aws")) return "AWS";
        if (value.equalsIgnoreCase("php")) return "PHP";
        if (value.equalsIgnoreCase("c")) return "C";
        if (value.equalsIgnoreCase("c++")) return "C++";
        if (value.equalsIgnoreCase("c#")) return "C#";
        if (value.equalsIgnoreCase(".net")) return ".NET";
        if (value.equalsIgnoreCase("rest api")) return "REST API";
        if (value.equalsIgnoreCase("node.js")) return "Node.js";
        if (value.equalsIgnoreCase("spring boot")) return "Spring Boot";
        if (value.equalsIgnoreCase("javafx")) return "JavaFX";
        if (value.equalsIgnoreCase("mysql")) return "MySQL";
        if (value.equalsIgnoreCase("javascript")) return "JavaScript";
        if (value.equalsIgnoreCase("typescript")) return "TypeScript";

        String[] parts = value.split(" ");
        StringBuilder result = new StringBuilder();

        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }

            if (!result.isEmpty()) {
                result.append(" ");
            }

            result.append(Character.toUpperCase(part.charAt(0)))
                  .append(part.substring(1).toLowerCase());
        }

        return result.toString();
    }

    private String formatLanguage(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT)
                + value.substring(1).toLowerCase(Locale.ROOT);
    }
}