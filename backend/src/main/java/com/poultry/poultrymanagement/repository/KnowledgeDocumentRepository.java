package com.poultry.poultrymanagement.repository;

import com.poultry.poultrymanagement.entity.KnowledgeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KnowledgeDocumentRepository extends JpaRepository<KnowledgeDocument, Long> {

    Optional<KnowledgeDocument> findByDocName(String docName);

    boolean existsByDocName(String docName);
}
