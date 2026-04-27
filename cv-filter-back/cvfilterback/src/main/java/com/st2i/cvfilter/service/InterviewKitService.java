package com.st2i.cvfilter.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.st2i.cvfilter.dto.InterviewKitResponse;
import com.st2i.cvfilter.exception.ResourceNotFoundException;
import com.st2i.cvfilter.model.Candidate;
import com.st2i.cvfilter.repository.CandidateRepository;

@Service
public class InterviewKitService {

    private final CandidateRepository candidateRepository;

    public InterviewKitService(CandidateRepository candidateRepository) {
        this.candidateRepository = candidateRepository;
    }

    public InterviewKitResponse generate(String candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        InterviewKitResponse response = new InterviewKitResponse();
        response.setCandidateId(candidate.getId());
        response.setCandidateName(candidate.getFullName());
        response.setSeniorityLevel(valueOrUnknown(candidate.getSeniorityLevel()));
        response.setJobTitle(valueOrUnknown(candidate.getCurrentJobTitle()));
        response.setTechnical(limit(buildTechnicalQuestions(candidate), 8));
        response.setProject(limit(buildProjectQuestions(candidate), 6));
        response.setHr(limit(buildHrQuestions(candidate), 5));
        response.setClarification(limit(buildClarificationQuestions(candidate), 6));
        return response;
    }

    private List<String> buildTechnicalQuestions(Candidate candidate) {
        Set<String> questions = new LinkedHashSet<>();
        String level = normalize(candidate.getSeniorityLevel());

        for (String skill : safeList(candidate.getSkills())) {
            String normalized = normalize(skill);
            if (normalized.contains("angular")) {
                questions.add(levelQuestion(level,
                        "What is dependency injection in Angular, and where did you use it in your work?",
                        "How do you structure Angular modules, services, and reusable components in a real project?",
                        "How would you design a scalable Angular frontend architecture for this type of HR platform?"));
                questions.add("How do you handle forms and validation in Angular when the form has many fields?");
            } else if (normalized.contains("java")) {
                questions.add(levelQuestion(level,
                        "Explain the difference between an interface and an abstract class in Java.",
                        "How do you handle exceptions and validation in a Java backend service?",
                        "How would you design Java services to stay testable, maintainable, and performant?"));
            } else if (normalized.contains("spring")) {
                questions.add(levelQuestion(level,
                        "What is dependency injection in Spring Boot?",
                        "How do you structure controllers, services, and repositories in Spring Boot?",
                        "How would you secure and scale a Spring Boot API used by HR users?"));
            } else if (normalized.contains("mysql") || normalized.equals("sql")) {
                questions.add(levelQuestion(level,
                        "How do primary keys, foreign keys, and indexes work in MySQL?",
                        "How would you design tables for candidates, skills, and interviews?",
                        "How do you investigate and optimize a slow SQL query?"));
            } else if (normalized.contains("react")) {
                questions.add(levelQuestion(level,
                        "How do React components pass data between parent and child?",
                        "How do hooks help you manage state and side effects in React?",
                        "How would you organize a large React application with shared state and reusable UI?"));
            } else if (normalized.contains("node")) {
                questions.add("You listed Node.js. What parts of the backend did you build with it?");
            } else if (normalized.contains("docker")) {
                questions.add("How have you used Docker to run or deploy an application?");
            } else if (!normalized.isBlank()) {
                questions.add("You listed " + skill + ". Can you describe a concrete task where you used it?");
            }
        }

        if (questions.isEmpty()) {
            questions.add("Which technologies from your CV are you strongest in, and can you show where you used them?");
        }

        return new ArrayList<>(questions);
    }

    private List<String> buildProjectQuestions(Candidate candidate) {
        Set<String> questions = new LinkedHashSet<>();
        String title = valueOrUnknown(candidate.getCurrentJobTitle());
        String text = normalize(candidate.getExtractedText());

        questions.add("Walk me through the most relevant project in your CV for a " + title + " role.");
        questions.add("What was your exact responsibility in that project, and what did you build yourself?");

        if (text.contains("intern") || text.contains("internship") || normalize(candidate.getSeniorityLevel()).contains("junior")) {
            questions.add("Describe your internship project and the main technical problem you solved.");
            questions.add("What did you learn during the internship that changed how you write code?");
        }

        if (hasSkill(candidate, "angular") || hasSkill(candidate, "react")) {
            questions.add("How did you structure the frontend, and how did it communicate with the backend?");
        }

        if (hasSkill(candidate, "spring") || hasSkill(candidate, "java") || hasSkill(candidate, "node")) {
            questions.add("Describe one backend endpoint or service you implemented and how you tested it.");
        }

        if (hasSkill(candidate, "mysql") || hasSkill(candidate, "sql") || text.contains("database")) {
            questions.add("Did you design the database yourself? Explain one schema decision you made.");
        }

        return new ArrayList<>(questions);
    }

    private List<String> buildHrQuestions(Candidate candidate) {
        List<String> questions = new ArrayList<>();
        String level = valueOrUnknown(candidate.getSeniorityLevel());
        String title = valueOrUnknown(candidate.getCurrentJobTitle());

        questions.add("Why are you interested in this " + title + " role?");
        questions.add("How do you usually learn a new technology when a project requires it?");
        questions.add("Tell me about a time you got stuck technically and how you resolved it.");

        if ("Junior".equalsIgnoreCase(candidate.getSeniorityLevel())) {
            questions.add("What kind of mentorship helps you learn fastest as a junior profile?");
        } else if ("Senior".equalsIgnoreCase(candidate.getSeniorityLevel())) {
            questions.add("How do you mentor junior developers and review technical decisions?");
        } else {
            questions.add("How do you balance autonomy with asking for help when needed?");
        }

        questions.add("What would make you successful in a " + level + " " + title + " position?");
        return questions;
    }

    private List<String> buildClarificationQuestions(Candidate candidate) {
        Set<String> questions = new LinkedHashSet<>();
        String text = normalize(candidate.getExtractedText());

        for (String skill : safeList(candidate.getSkills())) {
            questions.add("You listed " + skill + ". How deeply have you used it in a real project?");
        }

        if (candidate.getYearsOfExperience() == null || candidate.getYearsOfExperience() == 0.0) {
            questions.add("Your years of experience are unclear. How much hands-on professional or internship experience do you have?");
        }

        if (candidate.getCurrentJobTitle() == null || candidate.getCurrentJobTitle().isBlank()) {
            questions.add("Your current job title is unclear. What role best describes your recent work?");
        }

        if (candidate.getSkills() == null || candidate.getSkills().isEmpty()) {
            questions.add("Your CV has no clear skills list. Which technologies are you comfortable being interviewed on?");
        }

        if (!text.contains("project") && !text.contains("internship") && !text.contains("experience")) {
            questions.add("The CV does not clearly describe projects. Can you give one concrete project example with your contribution?");
        }

        if (hasSkill(candidate, "mysql") || hasSkill(candidate, "sql")) {
            questions.add("You mention database skills. Did you design tables and relationships yourself, or mostly query existing data?");
        }

        return new ArrayList<>(questions);
    }

    private String levelQuestion(String level, String junior, String mid, String senior) {
        if (level.contains("senior")) {
            return senior;
        }
        if (level.contains("mid")) {
            return mid;
        }
        return junior;
    }

    private boolean hasSkill(Candidate candidate, String skill) {
        return safeList(candidate.getSkills()).stream()
                .anyMatch(item -> normalize(item).contains(skill));
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }

    private List<String> limit(List<String> values, int max) {
        return values.stream().limit(max).toList();
    }

    private String valueOrUnknown(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
