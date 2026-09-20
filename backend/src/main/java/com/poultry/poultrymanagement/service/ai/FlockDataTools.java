package com.poultry.poultrymanagement.service.ai;

import com.poultry.poultrymanagement.entity.*;
import com.poultry.poultrymanagement.repository.*;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class FlockDataTools {

    private final BatchRepository batchRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final FeedStockRepository feedStockRepository;
    private final FeedLoadRepository feedLoadRepository;
    private final VaccineRepository vaccineRepository;
    private final RemarkRepository remarkRepository;
    private final SaleRepository saleRepository;
    private final ExpenseRepository expenseRepository;

    @Tool("Get live flock overview including age, initial birds, cumulative mortality, remaining live birds, latest weight, FCR, and feed stock.")
    @Transactional(readOnly = true)
    public Map<String, Object> getFlockOverview(@P("The ID of the batch/flock") Long batchId) {
        if (batchId == null) return Map.of("error", "Batch ID cannot be null");

        Optional<Batch> batchOpt = batchRepository.findById(batchId);
        if (batchOpt.isEmpty()) return Map.of("error", "Batch not found for ID: " + batchId);

        Batch batch = batchOpt.get();
        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);
        FeedStock feedStock = feedStockRepository.findByBatchId(batchId).orElse(null);

        int totalMortality = records.stream().mapToInt(DailyRecord::getMortality).sum();
        int remainingBirds = Math.max(0, batch.getInitialBirds() - totalMortality);
        int ageDays = calculateAge(batch.getStartDate());

        DailyRecord latest = records.isEmpty() ? null : records.get(records.size() - 1);
        BigDecimal avgWeight = latest != null && latest.getAvgWeightG() != null ? latest.getAvgWeightG() : null;
        BigDecimal fcr = latest != null && latest.getFcr() != null ? latest.getFcr() : null;
        BigDecimal stockKg = feedStock != null ? feedStock.getCurrentStockKg() : BigDecimal.ZERO;
        BigDecimal stockBags = feedStock != null ? feedStock.getCurrentBags() : BigDecimal.ZERO;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("batchId", batch.getId());
        result.put("batchCode", batch.getBatchCode());
        result.put("status", batch.getStatus().name());
        result.put("ageInDays", ageDays);
        result.put("initialBirds", batch.getInitialBirds());
        result.put("cumulativeMortality", totalMortality);
        result.put("mortalityPercentage", batch.getInitialBirds() > 0 ? ((double) totalMortality / batch.getInitialBirds() * 100.0) : 0.0);
        result.put("remainingLiveBirds", remainingBirds);
        result.put("latestAverageWeightG", avgWeight != null ? avgWeight : "Not yet recorded");
        result.put("cumulativeFCR", fcr != null ? fcr : "Not yet computed");
        result.put("currentFeedStockKg", stockKg);
        result.put("currentFeedStockBags", stockBags);
        result.put("totalDailyRecordsLogged", records.size());

        return result;
    }

    @Tool("Get recent daily mortality records and trend analysis over the past N days.")
    @Transactional(readOnly = true)
    public Map<String, Object> getMortalityTrend(
            @P("The ID of the batch/flock") Long batchId,
            @P("Number of recent days to inspect (e.g. 3, 7, 14)") int days
    ) {
        if (batchId == null) return Map.of("error", "Batch ID cannot be null");
        int queryDays = Math.max(1, Math.min(days, 30));

        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);
        if (records.isEmpty()) {
            return Map.of("message", "No daily records have been logged for this batch yet.");
        }

        int fromIndex = Math.max(0, records.size() - queryDays);
        List<DailyRecord> recent = records.subList(fromIndex, records.size());

        List<Map<String, Object>> dailyList = new ArrayList<>();
        int totalRecentMortality = 0;
        for (DailyRecord r : recent) {
            dailyList.add(Map.of(
                    "date", r.getRecordDate().toString(),
                    "dayMortality", r.getMortality(),
                    "morningMortality", r.getMorningMortality() != null ? r.getMorningMortality() : 0,
                    "cumulativeMortality", r.getCumulativeMortality(),
                    "remainingBirds", r.getRemainingBirds()
            ));
            totalRecentMortality += r.getMortality();
        }

        String trend = "STABLE";
        if (recent.size() >= 3) {
            DailyRecord d1 = recent.get(recent.size() - 3);
            DailyRecord d2 = recent.get(recent.size() - 2);
            DailyRecord d3 = recent.get(recent.size() - 1);
            if (d3.getMortality() > d2.getMortality() && d2.getMortality() > d1.getMortality() && d3.getMortality() > 5) {
                trend = "RISING_ALARM";
            } else if (d3.getMortality() < d2.getMortality() && d2.getMortality() < d1.getMortality()) {
                trend = "FALLING";
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("batchId", batchId);
        result.put("daysInspected", recent.size());
        result.put("totalMortalityInWindow", totalRecentMortality);
        result.put("mortalityTrend", trend);
        result.put("dailyHistory", dailyList);

        return result;
    }

    @Tool("Get growth trajectory, weight gains, and FCR efficiency metrics for the flock.")
    @Transactional(readOnly = true)
    public Map<String, Object> getGrowthAndFcrMetrics(@P("The ID of the batch/flock") Long batchId) {
        if (batchId == null) return Map.of("error", "Batch ID cannot be null");

        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);
        List<DailyRecord> weighted = records.stream()
                .filter(r -> r.getAvgWeightG() != null && r.getAvgWeightG().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        if (weighted.isEmpty()) {
            return Map.of("message", "No bird weight samples have been recorded yet for this flock.");
        }

        DailyRecord latest = weighted.get(weighted.size() - 1);
        DailyRecord previous = weighted.size() >= 2 ? weighted.get(weighted.size() - 2) : null;

        BigDecimal latestWeight = latest.getAvgWeightG();
        BigDecimal gain = previous != null ? latestWeight.subtract(previous.getAvgWeightG()) : BigDecimal.ZERO;
        long daysBetween = previous != null ? Math.max(1, ChronoUnit.DAYS.between(previous.getRecordDate(), latest.getRecordDate())) : 1;
        double dailyGain = previous != null ? gain.doubleValue() / daysBetween : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("latestWeightG", latestWeight);
        result.put("recordedDate", latest.getRecordDate().toString());
        result.put("previousWeightG", previous != null ? previous.getAvgWeightG() : "None");
        result.put("weightGainG", gain);
        result.put("approxDailyGainGrams", Math.round(dailyGain * 10.0) / 10.0);
        result.put("latestFcr", latest.getFcr() != null ? latest.getFcr() : "Not calculated");
        result.put("standardCobb500BenchmarkFcr", "1.45 - 1.65");

        return result;
    }

    @Tool("Get feed deliveries, daily feed consumption, and current feed stock inventory.")
    @Transactional(readOnly = true)
    public Map<String, Object> getFeedStockAndConsumption(@P("The ID of the batch/flock") Long batchId) {
        if (batchId == null) return Map.of("error", "Batch ID cannot be null");

        FeedStock feedStock = feedStockRepository.findByBatchId(batchId).orElse(null);
        List<FeedLoad> loads = feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId);
        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);

        BigDecimal totalLoadedKg = loads.stream()
                .map(l -> l.getBags().multiply(l.getWeightPerBagKg() != null ? l.getWeightPerBagKg() : BigDecimal.valueOf(50)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalConsumedKg = records.stream()
                .map(r -> r.getFeedConsumedKg() != null ? r.getFeedConsumedKg() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        DailyRecord latest = records.isEmpty() ? null : records.get(records.size() - 1);
        BigDecimal latestDailyFeedKg = latest != null && latest.getFeedConsumedKg() != null ? latest.getFeedConsumedKg() : BigDecimal.ZERO;

        BigDecimal stockKg = feedStock != null ? feedStock.getCurrentStockKg() : totalLoadedKg.subtract(totalConsumedKg);
        if (stockKg.compareTo(BigDecimal.ZERO) < 0) stockKg = BigDecimal.ZERO;

        int daysRemaining = 0;
        if (latestDailyFeedKg.compareTo(BigDecimal.ZERO) > 0 && stockKg.compareTo(BigDecimal.ZERO) > 0) {
            daysRemaining = stockKg.divide(latestDailyFeedKg, 0, RoundingMode.FLOOR).intValue();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalLoadedKg", totalLoadedKg);
        result.put("totalConsumedKg", totalConsumedKg);
        result.put("currentStockKg", stockKg);
        result.put("currentStockBags", feedStock != null ? feedStock.getCurrentBags() : stockKg.divide(BigDecimal.valueOf(50), 1, RoundingMode.HALF_UP));
        result.put("latestDailyIntakeKg", latestDailyFeedKg);
        result.put("estimatedDaysOfFeedRemaining", daysRemaining);
        result.put("isStockLow", stockKg.compareTo(BigDecimal.valueOf(200)) <= 0);

        return result;
    }

    @Tool("Get vaccination schedule and completed vaccination records for the flock.")
    @Transactional(readOnly = true)
    public Map<String, Object> getVaccinationHistory(@P("The ID of the batch/flock") Long batchId) {
        if (batchId == null) return Map.of("error", "Batch ID cannot be null");

        List<Vaccine> vaccines = vaccineRepository.findByBatchIdOrderByGivenDateAsc(batchId);
        List<Map<String, Object>> list = vaccines.stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("vaccineName", v.getVaccineName());
            m.put("givenDate", v.getGivenDate().toString());
            m.put("ageDays", v.getAgeDays() != null ? v.getAgeDays() : 0);
            m.put("remarks", v.getRemarks() != null ? v.getRemarks() : "");
            return m;
        }).collect(Collectors.toList());

        return Map.of(
                "batchId", batchId,
                "recordedVaccinationsCount", vaccines.size(),
                "vaccinationRecords", list
        );
    }

    @Tool("Get recent farmer observation logs, clinical notes, and shed remarks.")
    @Transactional(readOnly = true)
    public Map<String, Object> getRecentObservationsAndRemarks(@P("The ID of the batch/flock") Long batchId) {
        if (batchId == null) return Map.of("error", "Batch ID cannot be null");

        List<Remark> remarks = remarkRepository.findByBatchIdOrderByRemarkDateDesc(batchId);
        List<Map<String, Object>> list = remarks.stream().limit(10).map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", r.getRemarkDate().toString());
            m.put("note", r.getNote());
            m.put("author", r.getCreatedBy() != null ? r.getCreatedBy().getName() : "Farmer");
            return m;
        }).collect(Collectors.toList());

        return Map.of(
                "batchId", batchId,
                "recentRemarksCount", remarks.size(),
                "remarks", list
        );
    }

    @Tool("Get financial sales, bird lifting numbers, operational expenses, and net profit margin.")
    @Transactional(readOnly = true)
    public Map<String, Object> getFinancialSummary(@P("The ID of the batch/flock") Long batchId) {
        if (batchId == null) return Map.of("error", "Batch ID cannot be null");

        List<Sale> sales = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId);
        List<Expense> expenses = expenseRepository.findByBatchIdOrderByExpenseDateAsc(batchId);

        int birdsSold = sales.stream().mapToInt(Sale::getBirdsSold).sum();
        BigDecimal totalSalesRevenue = sales.stream()
                .map(s -> s.getRevenue() != null ? s.getRevenue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalExpenses = expenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netMargin = totalSalesRevenue.subtract(totalExpenses);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBirdsSold", birdsSold);
        result.put("totalSalesRevenue", totalSalesRevenue);
        result.put("totalExpenses", totalExpenses);
        result.put("netOperationalMargin", netMargin);
        result.put("salesEntriesCount", sales.size());
        result.put("expenseEntriesCount", expenses.size());

        return result;
    }

    private int calculateAge(LocalDate startDate) {
        if (startDate == null) return 1;
        return (int) Math.max(1, ChronoUnit.DAYS.between(startDate, LocalDate.now()) + 1);
    }
}
