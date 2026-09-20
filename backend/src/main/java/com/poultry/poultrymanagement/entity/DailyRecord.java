package com.poultry.poultrymanagement.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "daily_records",
    uniqueConstraints = @UniqueConstraint(columnNames = {"batch_id", "record_date"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @NotNull
    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @PositiveOrZero
    @Column(name = "morning_mortality", nullable = false)
    @Builder.Default
    private Integer morningMortality = 0;

    @PositiveOrZero
    @Column(name = "mortality", nullable = false)
    @Builder.Default
    private Integer mortality = 0;

    // Running total -- computed and set by the service layer on save
    @PositiveOrZero
    @Column(name = "cumulative_mortality", nullable = false)
    @Builder.Default
    private Integer cumulativeMortality = 0;

    @Column(name = "cumulative_mortality_pct", precision = 5, scale = 2)
    private BigDecimal cumulativeMortalityPct;

    @NotNull
    @Column(name = "remaining_birds", nullable = false)
    private Integer remainingBirds;

    @Column(name = "feed_type", length = 50)
    private String feedType;

    @Column(name = "bag_capacity_kg", precision = 6, scale = 2)
    private BigDecimal bagCapacityKg;

    @Column(name = "min_feed_intake_g", precision = 8, scale = 2)
    private BigDecimal minFeedIntakeG;

    @Column(name = "cumulative_feed_min_kg", precision = 10, scale = 2)
    private BigDecimal cumulativeFeedMinKg;

    @Column(name = "cumulative_feed_actual_kg", precision = 10, scale = 2)
    private BigDecimal cumulativeFeedActualKg;

    @PositiveOrZero
    @Column(name = "feed_consumed_kg", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal feedConsumedKg = BigDecimal.ZERO;

    @Column(name = "min_body_weight_g", precision = 8, scale = 2)
    private BigDecimal minBodyWeightG;

    @Column(name = "avg_weight_g", precision = 8, scale = 2)
    private BigDecimal avgWeightG;

    @Column(name = "standard_fcr", precision = 5, scale = 3)
    private BigDecimal standardFcr;

    @Column(name = "fcr", precision = 5, scale = 3)
    private BigDecimal fcr;

    @Column(name = "feed_bags_consumed", precision = 8, scale = 2)
    private BigDecimal feedBagsConsumed;

    @Column(name = "feed_bags_total", precision = 8, scale = 2)
    private BigDecimal feedBagsTotal;

    @Column(name = "feed_bags_closing_stock", precision = 8, scale = 2)
    private BigDecimal feedBagsClosingStock;

    @Column(name = "signature", length = 150)
    private String signature;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
