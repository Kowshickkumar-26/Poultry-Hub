package com.poultry.poultrymanagement.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
@Table(name = "feed_loads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedLoad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @NotNull
    @Column(name = "load_date", nullable = false)
    private LocalDate loadDate;

    @NotBlank
    @Column(name = "feed_type", nullable = false, length = 50)
    private String feedType;

    @NotNull
    @Positive
    @Column(name = "bags", nullable = false, precision = 7, scale = 2)
    private BigDecimal bags;

    @Column(name = "weight_per_bag_kg", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal weightPerBagKg = new BigDecimal("50.00");

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public BigDecimal getTotalWeightKg() {
        if (bags == null) return BigDecimal.ZERO;
        BigDecimal weight = weightPerBagKg != null ? weightPerBagKg : BigDecimal.valueOf(50);
        return bags.multiply(weight);
    }
}
