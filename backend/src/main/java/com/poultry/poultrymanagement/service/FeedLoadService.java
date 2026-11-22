package com.poultry.poultrymanagement.service;

import com.poultry.poultrymanagement.dto.FeedInventoryItemDto;
import com.poultry.poultrymanagement.dto.FeedLoadRequest;
import com.poultry.poultrymanagement.dto.FeedLoadResponse;
import com.poultry.poultrymanagement.dto.FeedStockResponse;
import com.poultry.poultrymanagement.entity.Batch;
import com.poultry.poultrymanagement.entity.BatchStatus;
import com.poultry.poultrymanagement.entity.DailyRecord;
import com.poultry.poultrymanagement.entity.FeedLoad;
import com.poultry.poultrymanagement.entity.FeedStock;
import com.poultry.poultrymanagement.entity.Farmer;
import com.poultry.poultrymanagement.entity.Role;
import com.poultry.poultrymanagement.repository.BatchRepository;
import com.poultry.poultrymanagement.repository.DailyRecordRepository;
import com.poultry.poultrymanagement.repository.FarmerRepository;
import com.poultry.poultrymanagement.repository.FeedLoadRepository;
import com.poultry.poultrymanagement.repository.FeedStockRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FeedLoadService {

    private final FeedLoadRepository feedLoadRepository;
    private final FeedStockRepository feedStockRepository;
    private final DailyRecordRepository dailyRecordRepository;
    private final BatchRepository batchRepository;
    private final FarmerRepository farmerRepository;
    private final BatchService batchService;

    public static final BigDecimal DEFAULT_WEIGHT_PER_BAG_KG = BigDecimal.valueOf(50);

    public static String normalizeFeedType(String raw) {
        if (raw == null) return "STARTER";
        String s = raw.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        if (s.contains("PRE")) {
            return "PRE_STARTER";
        } else if (s.contains("START")) {
            return "STARTER";
        } else if (s.contains("FINISH")) {
            return "FINISHER";
        }
        return s;
    }

    public static String formatFeedTypeDisplay(String normalized) {
        if (normalized == null) return "";
        String s = normalizeFeedType(normalized);
        switch (s) {
            case "PRE_STARTER":
                return "Pre-starter";
            case "STARTER":
                return "Starter";
            case "FINISHER":
                return "Finisher";
            default:
                if (s.length() <= 1) return s;
                return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase().replace("_", " ");
        }
    }

    @Transactional
    public FeedLoadResponse addFeedLoad(Long batchId, FeedLoadRequest request, Long loggedInUserId) {
        Batch batch = getOwnedBatchOrThrow(batchId, loggedInUserId);

        if (batch.getStatus() == BatchStatus.COMPLETED) {
            throw new com.poultry.poultrymanagement.exception.BatchCompletedException("Cannot add feed. This batch is already completed.");
        }

        if (batch.getStatus() != BatchStatus.ACTIVE) {
            throw new IllegalStateException("Feed can only be added to an ACTIVE batch");
        }

        if (request.getBags() == null || request.getBags().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Number of bags must be greater than zero");
        }
        if (request.getFeedType() == null || request.getFeedType().trim().isEmpty()) {
            throw new IllegalArgumentException("Feed type is required");
        }

        BigDecimal weightPerBag = request.getWeightPerBagKg() != null && request.getWeightPerBagKg().compareTo(BigDecimal.ZERO) > 0
                ? request.getWeightPerBagKg()
                : DEFAULT_WEIGHT_PER_BAG_KG;

        LocalDate loadDate = request.getLoadDate() != null ? request.getLoadDate() : LocalDate.now();
        String normalizedType = normalizeFeedType(request.getFeedType());
        String displayType = formatFeedTypeDisplay(normalizedType);

        FeedLoad load = FeedLoad.builder()
                .batch(batch)
                .loadDate(loadDate)
                .feedType(displayType)
                .bags(request.getBags())
                .weightPerBagKg(weightPerBag)
                .build();

        FeedLoad saved = feedLoadRepository.save(load);

        syncFeedStock(batchId);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<FeedLoadResponse> getFeedLoads(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);
        return feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FeedStockResponse getFeedStock(Long batchId, Long loggedInUserId, Role role) {
        batchService.getAccessibleBatch(batchId, loggedInUserId, role);

        FeedStock stock = feedStockRepository.findByBatchId(batchId)
                .orElseGet(() -> FeedStock.builder()
                        .batch(batchRepository.getReferenceById(batchId))
                        .currentBags(BigDecimal.ZERO)
                        .currentStockKg(BigDecimal.ZERO)
                        .build());

        List<FeedLoad> loads = feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId);
        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);

        BigDecimal totalLoadedKg = BigDecimal.ZERO;
        BigDecimal preStarterLoadedKg = BigDecimal.ZERO;
        BigDecimal starterLoadedKg = BigDecimal.ZERO;
        BigDecimal finisherLoadedKg = BigDecimal.ZERO;

        for (FeedLoad l : loads) {
            BigDecimal bagWeight = l.getWeightPerBagKg() != null ? l.getWeightPerBagKg() : DEFAULT_WEIGHT_PER_BAG_KG;
            BigDecimal loadKg = l.getBags().multiply(bagWeight);
            totalLoadedKg = totalLoadedKg.add(loadKg);

            String norm = normalizeFeedType(l.getFeedType());
            if ("PRE_STARTER".equals(norm)) {
                preStarterLoadedKg = preStarterLoadedKg.add(loadKg);
            } else if ("STARTER".equals(norm)) {
                starterLoadedKg = starterLoadedKg.add(loadKg);
            } else if ("FINISHER".equals(norm)) {
                finisherLoadedKg = finisherLoadedKg.add(loadKg);
            }
        }

        BigDecimal totalConsumedKg = BigDecimal.ZERO;
        BigDecimal preStarterConsumedKg = BigDecimal.ZERO;
        BigDecimal starterConsumedKg = BigDecimal.ZERO;
        BigDecimal finisherConsumedKg = BigDecimal.ZERO;

        for (DailyRecord r : records) {
            BigDecimal consumedKg = r.getFeedConsumedKg() != null ? r.getFeedConsumedKg() : BigDecimal.ZERO;
            totalConsumedKg = totalConsumedKg.add(consumedKg);

            String norm = normalizeFeedType(r.getFeedType());
            if ("PRE_STARTER".equals(norm)) {
                preStarterConsumedKg = preStarterConsumedKg.add(consumedKg);
            } else if ("STARTER".equals(norm)) {
                starterConsumedKg = starterConsumedKg.add(consumedKg);
            } else if ("FINISHER".equals(norm)) {
                finisherConsumedKg = finisherConsumedKg.add(consumedKg);
            }
        }

        // Exact mathematical flock feed stock balance (Total Loaded - Total Consumed)
        BigDecimal exactStockKg = totalLoadedKg.subtract(totalConsumedKg);
        if (exactStockKg.compareTo(BigDecimal.ZERO) < 0) {
            exactStockKg = BigDecimal.ZERO;
        }
        if (exactStockKg.scale() > 0 && exactStockKg.stripTrailingZeros().scale() <= 0) {
            exactStockKg = exactStockKg.setScale(0, RoundingMode.HALF_UP);
        }

        // Build itemized capacity-aware inventory
        List<FeedInventoryItemDto> inventory = buildItemizedInventory(loads, records);

        BigDecimal exactStockBags = inventory.stream()
                .map(FeedInventoryItemDto::getAvailableBags)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (exactStockBags.scale() > 0 && exactStockBags.stripTrailingZeros().scale() <= 0) {
            exactStockBags = exactStockBags.setScale(0, RoundingMode.HALF_UP);
        }

        return FeedStockResponse.builder()
                .batchId(batchId)
                .currentBags(exactStockBags)
                .currentStockKg(exactStockKg)
                .totalLoadedKg(totalLoadedKg)
                .totalConsumedKg(totalConsumedKg)
                .preStarterLoadedKg(preStarterLoadedKg)
                .starterLoadedKg(starterLoadedKg)
                .finisherLoadedKg(finisherLoadedKg)
                .preStarterConsumedKg(preStarterConsumedKg)
                .starterConsumedKg(starterConsumedKg)
                .finisherConsumedKg(finisherConsumedKg)
                .inventory(inventory)
                .lastUpdated(stock.getLastUpdated())
                .build();
    }

    public List<FeedInventoryItemDto> buildItemizedInventory(List<FeedLoad> loads, List<DailyRecord> records) {
        // Collect all distinct (normalizedFeedType, bagCapacity) pairs
        // Standard set of types & capacities
        String[] standardTypes = {"STARTER", "PRE_STARTER", "FINISHER"};
        BigDecimal[] standardCapacities = {BigDecimal.valueOf(50), BigDecimal.valueOf(70)};

        // Use a LinkedHashMap with key "TYPE#CAPACITY"
        Map<String, FeedInventoryItemDto> itemMap = new LinkedHashMap<>();

        for (String type : standardTypes) {
            for (BigDecimal cap : standardCapacities) {
                String key = type + "#" + cap.setScale(2, RoundingMode.HALF_UP);
                itemMap.put(key, FeedInventoryItemDto.builder()
                        .feedType(type)
                        .feedTypeDisplay(formatFeedTypeDisplay(type))
                        .bagCapacityKg(cap)
                        .loadedBags(BigDecimal.ZERO)
                        .consumedBags(BigDecimal.ZERO)
                        .availableBags(BigDecimal.ZERO)
                        .availableKg(BigDecimal.ZERO)
                        .stockStatus("OUT_OF_STOCK")
                        .build());
            }
        }

        // Add any non-standard loads
        for (FeedLoad l : loads) {
            String type = normalizeFeedType(l.getFeedType());
            BigDecimal cap = l.getWeightPerBagKg() != null ? l.getWeightPerBagKg() : DEFAULT_WEIGHT_PER_BAG_KG;
            String key = type + "#" + cap.setScale(2, RoundingMode.HALF_UP);
            itemMap.putIfAbsent(key, FeedInventoryItemDto.builder()
                    .feedType(type)
                    .feedTypeDisplay(formatFeedTypeDisplay(type))
                    .bagCapacityKg(cap)
                    .loadedBags(BigDecimal.ZERO)
                    .consumedBags(BigDecimal.ZERO)
                    .availableBags(BigDecimal.ZERO)
                    .availableKg(BigDecimal.ZERO)
                    .stockStatus("OUT_OF_STOCK")
                    .build());
        }

        // Aggregate loads
        for (FeedLoad l : loads) {
            String type = normalizeFeedType(l.getFeedType());
            BigDecimal cap = l.getWeightPerBagKg() != null ? l.getWeightPerBagKg() : DEFAULT_WEIGHT_PER_BAG_KG;
            String key = type + "#" + cap.setScale(2, RoundingMode.HALF_UP);
            FeedInventoryItemDto item = itemMap.get(key);
            if (item != null && l.getBags() != null) {
                item.setLoadedBags(item.getLoadedBags().add(l.getBags()));
            }
        }

        // Aggregate consumption from daily records
        for (DailyRecord r : records) {
            String type = normalizeFeedType(r.getFeedType());
            BigDecimal cap = r.getBagCapacityKg() != null ? r.getBagCapacityKg() : DEFAULT_WEIGHT_PER_BAG_KG;
            String key = type + "#" + cap.setScale(2, RoundingMode.HALF_UP);
            FeedInventoryItemDto item = itemMap.get(key);
            if (item == null) {
                item = FeedInventoryItemDto.builder()
                        .feedType(type)
                        .feedTypeDisplay(formatFeedTypeDisplay(type))
                        .bagCapacityKg(cap)
                        .loadedBags(BigDecimal.ZERO)
                        .consumedBags(BigDecimal.ZERO)
                        .availableBags(BigDecimal.ZERO)
                        .availableKg(BigDecimal.ZERO)
                        .stockStatus("OUT_OF_STOCK")
                        .build();
                itemMap.put(key, item);
            }

            BigDecimal bagsConsumed = r.getFeedBagsConsumed();
            if (bagsConsumed == null || bagsConsumed.compareTo(BigDecimal.ZERO) == 0) {
                if (r.getFeedConsumedKg() != null && r.getFeedConsumedKg().compareTo(BigDecimal.ZERO) > 0) {
                    bagsConsumed = r.getFeedConsumedKg().divide(cap, 2, RoundingMode.HALF_UP);
                } else {
                    bagsConsumed = BigDecimal.ZERO;
                }
            }
            item.setConsumedBags(item.getConsumedBags().add(bagsConsumed));
        }

        // Compute available and stock status
        List<FeedInventoryItemDto> result = new ArrayList<>();
        for (FeedInventoryItemDto item : itemMap.values()) {
            BigDecimal availBags = item.getLoadedBags().subtract(item.getConsumedBags());
            if (availBags.compareTo(BigDecimal.ZERO) < 0) {
                availBags = BigDecimal.ZERO;
            }
            if (availBags.scale() > 0 && availBags.stripTrailingZeros().scale() <= 0) {
                availBags = availBags.setScale(0, RoundingMode.HALF_UP);
            }
            BigDecimal availKg = availBags.multiply(item.getBagCapacityKg());
            if (availKg.scale() > 0 && availKg.stripTrailingZeros().scale() <= 0) {
                availKg = availKg.setScale(0, RoundingMode.HALF_UP);
            }
            item.setAvailableBags(availBags);
            item.setAvailableKg(availKg);

            if (availBags.compareTo(BigDecimal.ZERO) <= 0) {
                item.setStockStatus("OUT_OF_STOCK");
            } else if (availBags.compareTo(BigDecimal.valueOf(2)) <= 0) {
                item.setStockStatus("LOW_STOCK");
            } else {
                item.setStockStatus("NORMAL");
            }
            result.add(item);
        }

        return result;
    }

    @Transactional
    public void syncFeedStock(Long batchId) {
        FeedStock stock = feedStockRepository.findByBatchId(batchId)
                .orElseGet(() -> {
                    Batch batch = batchRepository.findById(batchId)
                            .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));
                    return FeedStock.builder()
                            .batch(batch)
                            .currentBags(BigDecimal.ZERO)
                            .currentStockKg(BigDecimal.ZERO)
                            .build();
                });

        List<FeedLoad> loads = feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId);
        List<DailyRecord> records = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);

        BigDecimal totalLoadedKg = loads.stream()
                .map(FeedLoad::getTotalWeightKg)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalConsumedKg = records.stream()
                .map(r -> r.getFeedConsumedKg() != null ? r.getFeedConsumedKg() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal exactStockKg = totalLoadedKg.subtract(totalConsumedKg);
        if (exactStockKg.compareTo(BigDecimal.ZERO) < 0) {
            exactStockKg = BigDecimal.ZERO;
        }

        List<FeedInventoryItemDto> inventory = buildItemizedInventory(loads, records);
        BigDecimal exactStockBags = inventory.stream()
                .map(FeedInventoryItemDto::getAvailableBags)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (exactStockBags.scale() > 0 && exactStockBags.stripTrailingZeros().scale() <= 0) {
            exactStockBags = exactStockBags.setScale(0, RoundingMode.HALF_UP);
        }

        stock.setCurrentStockKg(exactStockKg);
        stock.setCurrentBags(exactStockBags);
        feedStockRepository.save(stock);
    }

    private Batch getOwnedBatchOrThrow(Long batchId, Long loggedInUserId) {
        Farmer farmer = farmerRepository.findByUserId(loggedInUserId)
                .orElseThrow(() -> new EntityNotFoundException("No farmer profile linked to this account"));

        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found: " + batchId));

        if (!batch.getFarmer().getId().equals(farmer.getId())) {
            throw new AccessDeniedException("This batch does not belong to the logged-in farmer");
        }
        return batch;
    }

    private FeedLoadResponse toResponse(FeedLoad load) {
        BigDecimal weightPerBag = load.getWeightPerBagKg() != null ? load.getWeightPerBagKg() : DEFAULT_WEIGHT_PER_BAG_KG;
        BigDecimal totalWeightKg = load.getBags() != null ? load.getBags().multiply(weightPerBag) : BigDecimal.ZERO;

        return FeedLoadResponse.builder()
                .id(load.getId())
                .batchId(load.getBatch().getId())
                .loadDate(load.getLoadDate())
                .feedType(load.getFeedType())
                .bags(load.getBags())
                .weightPerBagKg(weightPerBag)
                .totalWeightKg(totalWeightKg)
                .createdAt(load.getCreatedAt())
                .build();
    }
}
