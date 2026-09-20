package com.poultry.poultrymanagement.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "feed_stock")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // One-to-one: every batch has exactly one running feed-stock balance.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false, unique = true)
    private Batch batch;

    @PositiveOrZero
    @Column(name = "current_bags", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal currentBags = BigDecimal.ZERO;

    @PositiveOrZero
    @Column(name = "current_stock_kg", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal currentStockKg = BigDecimal.ZERO;

    @UpdateTimestamp
    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;
}
