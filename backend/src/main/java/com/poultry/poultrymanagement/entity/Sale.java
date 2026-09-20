package com.poultry.poultrymanagement.entity;

import jakarta.persistence.*;
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
@Table(name = "sales")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @NotNull
    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    @Column(name = "trader_name", length = 150)
    private String traderName;

    @NotNull
    @Positive
    @Column(name = "birds_sold", nullable = false)
    private Integer birdsSold;

    @NotNull
    @Positive
    @Column(name = "total_weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalWeightKg;

    // Generated column in MySQL (total_weight_kg / birds_sold) -- read-only here.
    @Column(name = "avg_weight_per_bird_kg", insertable = false, updatable = false, precision = 6, scale = 3)
    private BigDecimal avgWeightPerBirdKg;

    @NotNull
    @Positive
    @Column(name = "rate_per_kg", nullable = false, precision = 8, scale = 2)
    private BigDecimal ratePerKg;

    @Column(name = "lifting_signature", length = 150)
    private String liftingSignature;

    // Generated column in MySQL (total_weight_kg * rate_per_kg) -- read-only here.
    @Column(name = "revenue", insertable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal revenue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
