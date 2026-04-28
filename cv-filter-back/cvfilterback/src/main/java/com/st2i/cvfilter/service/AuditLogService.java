package com.st2i.cvfilter.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.st2i.cvfilter.dto.AuditLogPageResponse;
import com.st2i.cvfilter.model.AuditLog;
import com.st2i.cvfilter.repository.AuditLogRepository;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final MongoTemplate mongoTemplate;

    public AuditLogService(AuditLogRepository auditLogRepository, MongoTemplate mongoTemplate) {
        this.auditLogRepository = auditLogRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public void log(String action, String targetType, String targetId, String targetName, String details) {
        AuditLog log = new AuditLog();
        log.setActorUsername(currentUsername());
        log.setActorRole(currentRole());
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setTargetName(targetName);
        log.setTimestamp(LocalDateTime.now());
        log.setDetails(details);
        auditLogRepository.save(log);
    }

    public List<AuditLog> findRecent() {
        return auditLogRepository.findTop200ByOrderByTimestampDesc();
    }

    public AuditLogPageResponse findPage(
            Integer page,
            Integer size,
            String actor,
            String action,
            String targetType,
            String keyword
    ) {
        int safePage = page == null || page < 0 ? 0 : page;
        int safeSize = size == null || size <= 0 ? 20 : Math.min(size, 100);

        Query countQuery = buildQuery(actor, action, targetType, keyword);
        long totalElements = mongoTemplate.count(countQuery, AuditLog.class);
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
        if (totalPages > 0 && safePage >= totalPages) {
            safePage = totalPages - 1;
        }

        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "timestamp"));
        Query pageQuery = buildQuery(actor, action, targetType, keyword)
                .with(pageable);

        List<AuditLog> content = mongoTemplate.find(pageQuery, AuditLog.class);
        return new AuditLogPageResponse(content, totalElements, totalPages, safePage);
    }

    private Query buildQuery(String actor, String action, String targetType, String keyword) {
        List<Criteria> criteria = new ArrayList<>();

        addContainsCriteria(criteria, "actorUsername", actor);
        addContainsCriteria(criteria, "action", action);
        addContainsCriteria(criteria, "targetType", targetType);

        if (keyword != null && !keyword.isBlank()) {
            Pattern pattern = containsPattern(keyword);
            criteria.add(new Criteria().orOperator(
                    Criteria.where("actorUsername").regex(pattern),
                    Criteria.where("actorRole").regex(pattern),
                    Criteria.where("action").regex(pattern),
                    Criteria.where("targetType").regex(pattern),
                    Criteria.where("targetId").regex(pattern),
                    Criteria.where("targetName").regex(pattern),
                    Criteria.where("details").regex(pattern)
            ));
        }

        Query query = new Query();
        if (!criteria.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteria.toArray(Criteria[]::new)));
        }
        return query;
    }

    private void addContainsCriteria(List<Criteria> criteria, String field, String value) {
        if (value != null && !value.isBlank()) {
            criteria.add(Criteria.where(field).regex(containsPattern(value)));
        }
    }

    private Pattern containsPattern(String value) {
        return Pattern.compile(".*" + Pattern.quote(value.trim()) + ".*", Pattern.CASE_INSENSITIVE);
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return "system";
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String preferredUsername = jwt.getClaimAsString("preferred_username");
            return preferredUsername == null || preferredUsername.isBlank() ? jwt.getSubject() : preferredUsername;
        }

        return authentication.getName() == null ? "system" : authentication.getName();
    }

    private String currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return "SYSTEM";
        }

        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        if (authorities.stream().anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()))) {
            return "ADMIN";
        }
        if (authorities.stream().anyMatch(authority -> "ROLE_HR".equals(authority.getAuthority()))) {
            return "HR";
        }
        return "USER";
    }
}
