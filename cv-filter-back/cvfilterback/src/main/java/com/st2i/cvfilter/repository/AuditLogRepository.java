package com.st2i.cvfilter.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.st2i.cvfilter.model.AuditLog;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    List<AuditLog> findTop200ByOrderByTimestampDesc();
}
