package com.poultry.poultrymanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ChatConversation conversation;

    @Column(nullable = false, length = 20)
    private String sender; // "USER" or "AI"

    @Lob
    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String text;

    @Column(length = 100)
    private String category;

    @Column(length = 30)
    private String confidence;

    @Column(name = "requires_veterinarian", nullable = false)
    @Builder.Default
    private boolean requiresVeterinarian = false;

    @Column(name = "key_insights_json", columnDefinition = "JSON")
    private String keyInsightsJson;

    @Column(name = "warning_signs_json", columnDefinition = "JSON")
    private String warningSignsJson;

    @Column(name = "sources_json", columnDefinition = "JSON")
    private String sourcesJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
