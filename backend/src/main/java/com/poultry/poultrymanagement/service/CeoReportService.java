package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.CeoMultiFarmReportResponse;
import com.poultry.poultrymanagement.entity.*;
import com.poultry.poultrymanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CeoReportService {

    private final FarmRepository farmRepository;
    private final FarmerRepository farmerRepository;
    private final BatchRepository batchRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final SaleRepository saleRepository;

    @Transactional(readOnly = true)
    public CeoMultiFarmReportResponse generateMultiFarmReport(
            Long farmId,
            BatchStatus batchStatus,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<Farm> allFarms = farmRepository.findAll();
        if (farmId != null) {
            allFarms = allFarms.stream()
                    .filter(f -> f.getId().equals(farmId))
                    .collect(Collectors.toList());
        }

        List<CeoMultiFarmReportResponse.FarmComparisonItem> farmRankings = new ArrayList<>();
        List<CeoMultiFarmReportResponse.BatchReportItem> batchReports = new ArrayList<>();
        List<CeoMultiFarmReportResponse.HeatmapCellItem> fcrHeatmap = new ArrayList<>();

        int networkInitialBirds = 0;
        int networkRemainingBirds = 0;
        int networkTotalMortality = 0;
        int networkActiveBatches = 0;
        int networkCompletedBatches = 0;
        BigDecimal networkTotalFeed = BigDecimal.ZERO;
        BigDecimal networkTotalRevenue = BigDecimal.ZERO;

        List<BigDecimal> validBatchFcrList = new ArrayList<>();
        List<BigDecimal> validBatchWeightList = new ArrayList<>();

        for (Farm farm : allFarms) {
            List<Farmer> farmers = farmerRepository.findByFarmId(farm.getId());
            Farmer primaryFarmer = farmers.isEmpty() ? null : farmers.get(0);
            String farmerName = primaryFarmer != null && primaryFarmer.getUser() != null
                    ? primaryFarmer.getUser().getName()
                    : "Unassigned";
            Long farmerId = primaryFarmer != null ? primaryFarmer.getId() : null;

            List<Batch> farmBatches = batchRepository.findByFarmId(farm.getId());
            if (batchStatus != null) {
                farmBatches = farmBatches.stream()
                        .filter(b -> b.getStatus() == batchStatus)
                        .collect(Collectors.toList());
            }

            int farmActiveBatches = 0;
            int farmCompletedBatches = 0;
            int farmInitialBirds = 0;
            int farmRemainingBirds = 0;
            int farmTotalMortality = 0;
            BigDecimal farmTotalFeed = BigDecimal.ZERO;
            BigDecimal farmTotalRevenue = BigDecimal.ZERO;
            List<BigDecimal> farmBatchFcrs = new ArrayList<>();
            List<BigDecimal> farmBatchWeights = new ArrayList<>();

            for (Batch batch : farmBatches) {
                if (batch.getStatus() == BatchStatus.ACTIVE) {
                    farmActiveBatches++;
                    networkActiveBatches++;
                } else if (batch.getStatus() == BatchStatus.COMPLETED) {
                    farmCompletedBatches++;
                    networkCompletedBatches++;
                }

                int batchInitBirds = batch.getInitialBirds() != null ? batch.getInitialBirds() : 0;
                farmInitialBirds += batchInitBirds;
                networkInitialBirds += batchInitBirds;

                List<DailyRecord> dailyRecords = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batch.getId());
                if (startDate != null) {
                    dailyRecords = dailyRecords.stream()
                            .filter(r -> !r.getRecordDate().isBefore(startDate))
                            .collect(Collectors.toList());
                }
                if (endDate != null) {
                    dailyRecords = dailyRecords.stream()
                            .filter(r -> !r.getRecordDate().isAfter(endDate))
                            .collect(Collectors.toList());
                }

                // Batch mortality & remaining calculation
                Optional<DailyRecord> latestRecord = dailyRecords.isEmpty()
                        ? Optional.empty()
                        : Optional.of(dailyRecords.get(dailyRecords.size() - 1));

                int batchMortality = latestRecord.map(DailyRecord::getCumulativeMortality).orElse(0);
                if (batchMortality == 0 && !dailyRecords.isEmpty()) {
                    batchMortality = dailyRecords.stream().mapToInt(r -> r.getMortality() != null ? r.getMortality() : 0).sum();
                }

                List<Sale> sales = saleRepository.findByBatchIdOrderBySaleDateAsc(batch.getId());
                if (startDate != null) {
                    sales = sales.stream().filter(s -> !s.getSaleDate().isBefore(startDate)).collect(Collectors.toList());
                }
                if (endDate != null) {
                    sales = sales.stream().filter(s -> !s.getSaleDate().isAfter(endDate)).collect(Collectors.toList());
                }

                int batchBirdsSold = sales.stream()
                        .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                        .sum();

                int batchRemaining = Math.max(0, batchInitBirds - batchMortality - batchBirdsSold);
                farmRemainingBirds += batchRemaining;
                networkRemainingBirds += batchRemaining;

                farmTotalMortality += batchMortality;
                networkTotalMortality += batchMortality;

                BigDecimal batchFeed = dailyRecords.stream()
                        .map(r -> r.getFeedConsumedKg() != null ? r.getFeedConsumedKg() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                farmTotalFeed = farmTotalFeed.add(batchFeed);
                networkTotalFeed = networkTotalFeed.add(batchFeed);

                BigDecimal batchRevenue = sales.stream()
                        .map(s -> {
                            if (s.getRevenue() != null) return s.getRevenue();
                            if (s.getTotalWeightKg() != null && s.getRatePerKg() != null) {
                                return s.getTotalWeightKg().multiply(s.getRatePerKg());
                            }
                            return BigDecimal.ZERO;
                        })
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                farmTotalRevenue = farmTotalRevenue.add(batchRevenue);
                networkTotalRevenue = networkTotalRevenue.add(batchRevenue);

                BigDecimal batchMortalityPct = batchInitBirds > 0
                        ? BigDecimal.valueOf(batchMortality * 100.0 / batchInitBirds).setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                BigDecimal latestWeight = latestRecord.map(DailyRecord::getAvgWeightG).orElse(null);
                if (latestWeight != null && latestWeight.compareTo(BigDecimal.ZERO) > 0) {
                    farmBatchWeights.add(latestWeight);
                    validBatchWeightList.add(latestWeight);
                }

                BigDecimal latestFcr = latestRecord.map(DailyRecord::getFcr).orElse(null);
                if (latestFcr != null && latestFcr.compareTo(BigDecimal.ZERO) > 0) {
                    farmBatchFcrs.add(latestFcr);
                    validBatchFcrList.add(latestFcr);
                }

                batchReports.add(CeoMultiFarmReportResponse.BatchReportItem.builder()
                        .batchId(batch.getId())
                        .batchCode(batch.getBatchCode())
                        .farmId(farm.getId())
                        .farmName(farm.getName())
                        .farmerId(farmerId)
                        .farmerName(farmerName)
                        .status(batch.getStatus())
                        .startDate(batch.getStartDate())
                        .endDate(batch.getEndDate())
                        .initialBirds(batchInitBirds)
                        .remainingBirds(batchRemaining)
                        .totalMortality(batchMortality)
                        .mortalityPct(batchMortalityPct)
                        .latestAvgWeightG(latestWeight)
                        .latestFcr(latestFcr)
                        .totalFeedConsumedKg(batchFeed.setScale(2, RoundingMode.HALF_UP))
                        .totalRevenue(batchRevenue.setScale(2, RoundingMode.HALF_UP))
                        .build());

                // Build heatmap cells for this batch's daily records
                int recordIndex = 0;
                for (DailyRecord record : dailyRecords) {
                    recordIndex++;
                    Integer dayNumber = recordIndex;
                    if (batch.getStartDate() != null && record.getRecordDate() != null) {
                        long daysBetween = ChronoUnit.DAYS.between(batch.getStartDate(), record.getRecordDate()) + 1;
                        if (daysBetween > 0) {
                            dayNumber = (int) daysBetween;
                        }
                    }

                    BigDecimal fcr = record.getFcr();
                    String fcrCategory = "NO_DATA";
                    if (fcr != null && fcr.compareTo(BigDecimal.ZERO) > 0) {
                        if (fcr.compareTo(BigDecimal.valueOf(1.50)) < 0) {
                            fcrCategory = "EXCELLENT";
                        } else if (fcr.compareTo(BigDecimal.valueOf(1.75)) <= 0) {
                            fcrCategory = "NORMAL";
                        } else {
                            fcrCategory = "NEEDS_ATTENTION";
                        }
                    }

                    fcrHeatmap.add(CeoMultiFarmReportResponse.HeatmapCellItem.builder()
                            .farmId(farm.getId())
                            .farmName(farm.getName())
                            .batchId(batch.getId())
                            .batchCode(batch.getBatchCode())
                            .recordDate(record.getRecordDate())
                            .dayNumber(dayNumber)
                            .fcr(fcr)
                            .fcrCategory(fcrCategory)
                            .mortality(record.getMortality())
                            .feedConsumedKg(record.getFeedConsumedKg())
                            .avgWeightG(record.getAvgWeightG())
                            .build());
                }
            }

            BigDecimal farmMortalityPct = farmInitialBirds > 0
                    ? BigDecimal.valueOf(farmTotalMortality * 100.0 / farmInitialBirds).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            BigDecimal farmAvgFcr = farmBatchFcrs.isEmpty()
                    ? null
                    : farmBatchFcrs.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(farmBatchFcrs.size()), 3, RoundingMode.HALF_UP);

            BigDecimal farmAvgWeight = farmBatchWeights.isEmpty()
                    ? null
                    : farmBatchWeights.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(farmBatchWeights.size()), 2, RoundingMode.HALF_UP);

            String perfStatus = "NO_DATA";
            String perfNote = "No active batch records";
            if (farmAvgFcr != null) {
                if (farmAvgFcr.compareTo(BigDecimal.valueOf(1.55)) <= 0 && farmMortalityPct.compareTo(BigDecimal.valueOf(3.5)) <= 0) {
                    perfStatus = "EXCELLENT";
                    perfNote = "Low FCR (<1.55) and low mortality (<3.5%)";
                } else if (farmAvgFcr.compareTo(BigDecimal.valueOf(1.75)) <= 0 && farmMortalityPct.compareTo(BigDecimal.valueOf(6.0)) <= 0) {
                    perfStatus = "GOOD";
                    perfNote = "Target FCR (<1.75) with stable flock health";
                } else {
                    perfStatus = "NEEDS_ATTENTION";
                    perfNote = "Elevated FCR (>1.75) or higher mortality (>6.0%)";
                }
            } else if (!farmBatches.isEmpty()) {
                perfStatus = "GOOD";
                perfNote = "Batches active, awaiting FCR calculation";
            }

            farmRankings.add(CeoMultiFarmReportResponse.FarmComparisonItem.builder()
                    .farmId(farm.getId())
                    .farmName(farm.getName())
                    .farmLocation(farm.getLocation() != null ? farm.getLocation() : "—")
                    .farmerId(farmerId)
                    .farmerName(farmerName)
                    .activeBatchesCount(farmActiveBatches)
                    .completedBatchesCount(farmCompletedBatches)
                    .totalBatchesCount(farmBatches.size())
                    .totalBirds(farmInitialBirds)
                    .remainingBirds(farmRemainingBirds)
                    .totalMortality(farmTotalMortality)
                    .mortalityPct(farmMortalityPct)
                    .avgWeightG(farmAvgWeight)
                    .avgFcr(farmAvgFcr)
                    .totalFeedConsumedKg(farmTotalFeed.setScale(2, RoundingMode.HALF_UP))
                    .totalRevenue(farmTotalRevenue.setScale(2, RoundingMode.HALF_UP))
                    .performanceStatus(perfStatus)
                    .performanceNote(perfNote)
                    .build());
        }

        // Compute Network KPIs
        BigDecimal networkMortalityPct = networkInitialBirds > 0
                ? BigDecimal.valueOf(networkTotalMortality * 100.0 / networkInitialBirds).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal networkAvgFcr = validBatchFcrList.isEmpty()
                ? null
                : validBatchFcrList.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(validBatchFcrList.size()), 3, RoundingMode.HALF_UP);

        BigDecimal networkAvgWeight = validBatchWeightList.isEmpty()
                ? null
                : validBatchWeightList.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(validBatchWeightList.size()), 2, RoundingMode.HALF_UP);

        CeoMultiFarmReportResponse.NetworkKpis networkKpis = CeoMultiFarmReportResponse.NetworkKpis.builder()
                .totalFarms(allFarms.size())
                .totalActiveBatches(networkActiveBatches)
                .totalCompletedBatches(networkCompletedBatches)
                .totalBatches(networkActiveBatches + networkCompletedBatches)
                .totalInitialBirds(networkInitialBirds)
                .totalRemainingBirds(networkRemainingBirds)
                .totalMortality(networkTotalMortality)
                .networkMortalityPct(networkMortalityPct)
                .averageFcr(networkAvgFcr)
                .totalFeedConsumedKg(networkTotalFeed.setScale(2, RoundingMode.HALF_UP))
                .totalRevenue(networkTotalRevenue.setScale(2, RoundingMode.HALF_UP))
                .averageBirdWeightG(networkAvgWeight)
                .build();

        return CeoMultiFarmReportResponse.builder()
                .networkKpis(networkKpis)
                .farmRankings(farmRankings)
                .batchReports(batchReports)
                .fcrHeatmap(fcrHeatmap)
                .build();
    }
}
