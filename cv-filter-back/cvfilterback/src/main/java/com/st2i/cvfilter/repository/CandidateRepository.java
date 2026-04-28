package com.st2i.cvfilter.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.st2i.cvfilter.model.Candidate;

@Repository
public interface CandidateRepository extends MongoRepository<Candidate, String> {

    Optional<Candidate> findByEmail(String email);

    List<Candidate> findBySeniorityLevelIgnoreCase(String seniorityLevel);

    List<Candidate> findBySkillsContainingIgnoreCase(String skill);

    List<Candidate> findByShortlistedTrue();
}
