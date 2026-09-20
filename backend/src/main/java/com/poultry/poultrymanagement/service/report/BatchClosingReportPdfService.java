package com.poultry.poultrymanagement.service.report;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.poultry.poultrymanagement.dto.FeedInventoryItemDto;
import com.poultry.poultrymanagement.entity.*;
import com.poultry.poultrymanagement.exception.BatchNotEligibleForClosingReportException;
import com.poultry.poultrymanagement.repository.*;
import com.poultry.poultrymanagement.service.BatchService;
import com.poultry.poultrymanagement.service.FeedLoadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchClosingReportPdfService {

    private final BatchService batchService;
    private final DailyRecordRepository dailyRecordRepository;
    private final SaleRepository saleRepository;
    private final FeedLoadRepository feedLoadRepository;
    private final FeedLoadService feedLoadService;
    private final VaccineRepository vaccineRepository;
    private final ExpenseRepository expenseRepository;
    private final RemarkRepository remarkRepository;

    // Brand Color Palette
    private static final Color PRIMARY_EMERALD = new Color(6, 78, 59);     // #064e3b
    private static final Color ACCENT_EMERALD = new Color(4, 120, 87);      // #047857
    private static final Color TEAL_ACCENT = new Color(13, 148, 136);       // #0d9488
    private static final Color TEXT_DARK = new Color(15, 23, 42);           // #0f172a
    private static final Color TEXT_MUTED = new Color(100, 116, 139);       // #64748b
    private static final Color BG_LIGHT = new Color(248, 250, 252);         // #f8fafc
    private static final Color BG_ALT_ROW = new Color(241, 245, 249);       // #f1f5f9
    private static final Color BORDER_LIGHT = new Color(226, 232, 240);     // #e2e8f0
    private static final Color ROSE_ACCENT = new Color(225, 29, 72);        // #e11d48
    private static final Color AMBER_ACCENT = new Color(217, 119, 6);       // #d97706
    private static final Color KPI_BG = new Color(240, 253, 244);           // #f0fdf4
    private static final Color KPI_BORDER = new Color(187, 247, 208);       // #bbf7d0

    // Typography
    private static final Font FONT_HEADER_TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE);
    private static final Font FONT_HEADER_SUB = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(209, 250, 229));
    private static final Font FONT_SECTION_TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, PRIMARY_EMERALD);
    private static final Font FONT_SECTION_SUB = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_MUTED);
    private static final Font FONT_TH = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
    private static final Font FONT_TD = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_DARK);
    private static final Font FONT_TD_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, TEXT_DARK);
    private static final Font FONT_TD_MUTED = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_MUTED);
    private static final Font FONT_KPI_LABEL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, TEXT_MUTED);
    private static final Font FONT_KPI_VALUE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, PRIMARY_EMERALD);
    private static final Font FONT_LABEL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, TEXT_MUTED);
    private static final Font FONT_VALUE = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_DARK);
    private static final Font FONT_VALUE_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, TEXT_DARK);

    // Formatters
    private static final DecimalFormat CURRENCY_FMT = new DecimalFormat("$#,##0.00");
    private static final DecimalFormat NUMBER_FMT = new DecimalFormat("#,##0");
    private static final DecimalFormat DECIMAL_FMT = new DecimalFormat("#,##0.00");
    private static final DecimalFormat FCR_FMT = new DecimalFormat("0.000");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIMESTAMP_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Transactional(readOnly = true)
    public byte[] generateClosingReport(Long batchId, Long loggedInUserId, Role role) {
        // 1. Authoritative access check & batch retrieval
        Batch batch = batchService.getAccessibleBatch(batchId, loggedInUserId, role);

        // 2. Validate batch completion status
        if (batch.getStatus() != BatchStatus.COMPLETED) {
            throw new BatchNotEligibleForClosingReportException(
                    String.format("Batch %s is currently %s. Closing reports can only be generated for COMPLETED batches.",
                            batch.getBatchCode(), batch.getStatus())
            );
        }

        // 3. Fetch all authoritative batch records
        List<DailyRecord> dailyRecords = dailyRecordRepository.findByBatchIdOrderByRecordDateAsc(batchId);
        List<Sale> sales = saleRepository.findByBatchIdOrderBySaleDateAsc(batchId);
        List<FeedLoad> feedLoads = feedLoadRepository.findByBatchIdOrderByLoadDateAsc(batchId);
        List<Vaccine> vaccines = vaccineRepository.findByBatchIdOrderByGivenDateAsc(batchId);
        List<Expense> expenses = expenseRepository.findByBatchIdOrderByExpenseDateAsc(batchId);
        List<Remark> remarks = remarkRepository.findByBatchIdOrderByRemarkDateAsc(batchId);

        // 4. Calculate authoritative core metrics
        int initialBirds = batch.getInitialBirds() != null ? batch.getInitialBirds() : 0;
        int totalMortality = dailyRecords.stream()
                .mapToInt(r -> r.getMortality() != null ? r.getMortality() : 0)
                .sum();

        int totalBirdsSold = sales.stream()
                .mapToInt(s -> s.getBirdsSold() != null ? s.getBirdsSold() : 0)
                .sum();

        int finalRemainingBirds = Math.max(0, initialBirds - totalMortality - totalBirdsSold);

        double mortalityPct = initialBirds > 0 ? (totalMortality * 100.0) / initialBirds : 0.0;

        BigDecimal totalFeedConsumedKg = dailyRecords.stream()
                .map(r -> r.getFeedConsumedKg() != null ? r.getFeedConsumedKg() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        DailyRecord latestDailyRecord = dailyRecords.isEmpty() ? null : dailyRecords.get(dailyRecords.size() - 1);

        BigDecimal finalAvgWeightG = null;
        if (latestDailyRecord != null && latestDailyRecord.getAvgWeightG() != null) {
            finalAvgWeightG = latestDailyRecord.getAvgWeightG();
        } else if (!sales.isEmpty()) {
            BigDecimal totalSaleWeight = sales.stream()
                    .map(s -> s.getTotalWeightKg() != null ? s.getTotalWeightKg() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (totalBirdsSold > 0) {
                finalAvgWeightG = totalSaleWeight.multiply(BigDecimal.valueOf(1000))
                        .divide(BigDecimal.valueOf(totalBirdsSold), 2, RoundingMode.HALF_UP);
            }
        }

        BigDecimal finalFcr = latestDailyRecord != null ? latestDailyRecord.getFcr() : null;

        long durationDays = 0;
        if (batch.getStartDate() != null && batch.getEndDate() != null) {
            durationDays = ChronoUnit.DAYS.between(batch.getStartDate(), batch.getEndDate()) + 1;
        } else if (batch.getStartDate() != null) {
            durationDays = ChronoUnit.DAYS.between(batch.getStartDate(), LocalDate.now()) + 1;
        }
        if (durationDays < 1) durationDays = 1;

        // 5. Generate PDF Document using OpenPDF
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 40, 45); // 0.5 in margins

        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            PdfPageEventHandler eventHandler = new PdfPageEventHandler(batch.getBatchCode());
            writer.setPageEvent(eventHandler);

            document.open();

            // ==========================================
            // PAGE 1: BATCH CLOSING SUMMARY
            // ==========================================
            addHeaderBanner(document, "BATCH CLOSING REPORT", "Authoritative Lifecycle & Production Completion Summary");

            addBatchInfoSection(document, batch, durationDays);

            addKeyMetricsGrid(document, initialBirds, totalMortality, mortalityPct, finalRemainingBirds,
                    totalBirdsSold, finalAvgWeightG, totalFeedConsumedKg, finalFcr, durationDays);

            addOutcomeSummaryTable(document, initialBirds, totalMortality, mortalityPct, finalRemainingBirds,
                    totalBirdsSold, finalAvgWeightG, totalFeedConsumedKg, finalFcr, durationDays);

            // ==========================================
            // PAGE 2: SALES REPORT
            // ==========================================
            document.newPage();
            addSectionHeader(document, "SALES & LIFTING REPORT", "Comprehensive transaction ledger of all bird liftings and realized farm revenues");
            addSalesReportTable(document, sales);

            // ==========================================
            // PAGE 3: FEED + PRODUCTION SUMMARY
            // ==========================================
            document.newPage();
            addSectionHeader(document, "FEED INVENTORY & UTILIZATION", "Capacity-aware breakdown of loaded vs consumed feed stock by bag size");
            List<FeedInventoryItemDto> itemizedInventory = feedLoadService.buildItemizedInventory(feedLoads, dailyRecords);
            addFeedSummaryTable(document, itemizedInventory);

            addSectionHeader(document, "RECENT DAILY PRODUCTION LOGS", "Authoritative flock telemetry from closing phase of batch");
            addRecentDailyRecordsTable(document, dailyRecords, batch.getStartDate());

            // ==========================================
            // PAGE 4: IMPORTANT RECORDS & VERIFICATION
            // ==========================================
            document.newPage();
            addSectionHeader(document, "VACCINATION & HEALTH LOG", "Immunization records administered during batch lifecycle");
            addVaccinationsTable(document, vaccines);

            addSectionHeader(document, "FARM CLINICAL REMARKS & OBSERVATIONS", "Operational notes and flock inspection logs");
            addRemarksTable(document, remarks);

            addSectionHeader(document, "BATCH EXPENSES SUMMARY", "Operational expenditures attributed to this batch cycle");
            addExpensesTable(document, expenses);

            addSignoffSection(document);

            document.close();
        } catch (DocumentException e) {
            log.error("Failed to generate Batch Closing Report PDF for batchId: {}", batchId, e);
            throw new RuntimeException("Error occurred while generating Batch Closing Report PDF: " + e.getMessage(), e);
        }

        return out.toByteArray();
    }

    // =========================================================================
    // SECTION BUILDERS
    // =========================================================================

    private void addHeaderBanner(Document document, String title, String subtitle) throws DocumentException {
        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);
        banner.setSpacingAfter(12);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(PRIMARY_EMERALD);
        cell.setPadding(12);
        cell.setBorder(Rectangle.NO_BORDER);

        Paragraph pBrand = new Paragraph("POULTRY MANAGEMENT SYSTEM", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEAL_ACCENT));
        pBrand.setSpacingAfter(2);
        cell.addElement(pBrand);

        Paragraph pTitle = new Paragraph(title, FONT_HEADER_TITLE);
        pTitle.setSpacingAfter(3);
        cell.addElement(pTitle);

        Paragraph pSub = new Paragraph(subtitle, FONT_HEADER_SUB);
        cell.addElement(pSub);

        banner.addCell(cell);
        document.add(banner);
    }

    private void addSectionHeader(Document document, String title, String subtitle) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(1);
        headerTable.setWidthPercentage(100);
        headerTable.setSpacingBefore(10);
        headerTable.setSpacingAfter(6);

        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(ACCENT_EMERALD);
        cell.setBorderWidth(1.5f);
        cell.setPaddingBottom(4);

        Paragraph pTitle = new Paragraph(title, FONT_SECTION_TITLE);
        cell.addElement(pTitle);

        if (subtitle != null && !subtitle.isEmpty()) {
            Paragraph pSub = new Paragraph(subtitle, FONT_SECTION_SUB);
            cell.addElement(pSub);
        }

        headerTable.addCell(cell);
        document.add(headerTable);
    }

    private void addBatchInfoSection(Document document, Batch batch, long durationDays) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{22, 28, 22, 28});
        table.setSpacingAfter(12);

        String farmerName = batch.getFarmer() != null && batch.getFarmer().getUser() != null
                ? batch.getFarmer().getUser().getName() : "N/A";
        String farmName = batch.getFarm() != null ? batch.getFarm().getName() : "N/A";
        String startDate = batch.getStartDate() != null ? batch.getStartDate().format(DATE_FMT) : "N/A";
        String endDate = batch.getEndDate() != null ? batch.getEndDate().format(DATE_FMT) : "N/A";
        String reportDate = LocalDateTime.now().format(TIMESTAMP_FMT);

        addInfoCell(table, "Batch Code:", batch.getBatchCode(), true);
        addInfoCell(table, "Batch Status:", batch.getStatus().name(), true);
        addInfoCell(table, "Farm Name:", farmName, false);
        addInfoCell(table, "Farmer Name:", farmerName, false);
        addInfoCell(table, "Batch Start Date:", startDate, false);
        addInfoCell(table, "Batch End Date:", endDate, false);
        addInfoCell(table, "Batch Duration:", durationDays + " Days", false);
        addInfoCell(table, "Report Generated:", reportDate, false);

        document.add(table);
    }

    private void addInfoCell(PdfPTable table, String label, String value, boolean isBoldValue) {
        PdfPCell cellLabel = new PdfPCell(new Phrase(label, FONT_LABEL));
        cellLabel.setBackgroundColor(BG_LIGHT);
        cellLabel.setBorderColor(BORDER_LIGHT);
        cellLabel.setPadding(5);

        PdfPCell cellVal = new PdfPCell(new Phrase(value, isBoldValue ? FONT_VALUE_BOLD : FONT_VALUE));
        cellVal.setBackgroundColor(Color.WHITE);
        cellVal.setBorderColor(BORDER_LIGHT);
        cellVal.setPadding(5);

        table.addCell(cellLabel);
        table.addCell(cellVal);
    }

    private void addKeyMetricsGrid(
            Document document,
            int initialBirds,
            int totalMortality,
            double mortalityPct,
            int finalRemainingBirds,
            int totalBirdsSold,
            BigDecimal finalAvgWeightG,
            BigDecimal totalFeedConsumedKg,
            BigDecimal finalFcr,
            long durationDays
    ) throws DocumentException {
        Paragraph heading = new Paragraph("EXECUTIVE KEY PERFORMANCE INDICATORS", FONT_SECTION_TITLE);
        heading.setSpacingBefore(6);
        heading.setSpacingAfter(6);
        document.add(heading);

        PdfPTable grid = new PdfPTable(3);
        grid.setWidthPercentage(100);
        grid.setWidths(new float[]{33.3f, 33.3f, 33.3f});
        grid.setSpacingAfter(14);

        String avgWeightStr = finalAvgWeightG != null
                ? DECIMAL_FMT.format(finalAvgWeightG.divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP)) + " kg (" + NUMBER_FMT.format(finalAvgWeightG) + " g)"
                : "N/A";

        String fcrStr = finalFcr != null ? FCR_FMT.format(finalFcr) : "N/A";
        String feedStr = DECIMAL_FMT.format(totalFeedConsumedKg) + " kg";
        String mortPctStr = DECIMAL_FMT.format(mortalityPct) + "%";

        addKpiCard(grid, "INITIAL BIRDS PLACED", NUMBER_FMT.format(initialBirds), "Flock Start Size", PRIMARY_EMERALD);
        addKpiCard(grid, "TOTAL MORTALITY", NUMBER_FMT.format(totalMortality), mortPctStr + " Mortality Rate", ROSE_ACCENT);
        addKpiCard(grid, "FINAL / REMAINING BIRDS", NUMBER_FMT.format(finalRemainingBirds), "Surviving Flock", PRIMARY_EMERALD);

        addKpiCard(grid, "TOTAL BIRDS SOLD", NUMBER_FMT.format(totalBirdsSold), "Market Lifting Count", ACCENT_EMERALD);
        addKpiCard(grid, "FINAL AVERAGE WEIGHT", avgWeightStr, "Bird Harvest Mass", PRIMARY_EMERALD);
        addKpiCard(grid, "TOTAL FEED CONSUMED", feedStr, "Cumulative Intake", AMBER_ACCENT);

        addKpiCard(grid, "FINAL FCR", fcrStr, "Feed Conversion Ratio", ACCENT_EMERALD);
        addKpiCard(grid, "MORTALITY PERCENTAGE", mortPctStr, "Flock Loss Ratio", ROSE_ACCENT);
        addKpiCard(grid, "BATCH LIFECYCLE DURATION", durationDays + " Days", "Total Rearing Time", PRIMARY_EMERALD);

        document.add(grid);
    }

    private void addKpiCard(PdfPTable table, String label, String value, String subtext, Color valueColor) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(KPI_BG);
        cell.setBorderColor(KPI_BORDER);
        cell.setBorderWidth(1f);
        cell.setPadding(8);

        Paragraph pLabel = new Paragraph(label, FONT_KPI_LABEL);
        pLabel.setSpacingAfter(2);
        cell.addElement(pLabel);

        Font valFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, valueColor);
        Paragraph pValue = new Paragraph(value, valFont);
        pValue.setSpacingAfter(1);
        cell.addElement(pValue);

        Paragraph pSub = new Paragraph(subtext, FontFactory.getFont(FontFactory.HELVETICA, 7, TEXT_MUTED));
        cell.addElement(pSub);

        table.addCell(cell);
    }

    private void addOutcomeSummaryTable(
            Document document,
            int initialBirds,
            int totalMortality,
            double mortalityPct,
            int finalRemainingBirds,
            int totalBirdsSold,
            BigDecimal finalAvgWeightG,
            BigDecimal totalFeedConsumedKg,
            BigDecimal finalFcr,
            long durationDays
    ) throws DocumentException {
        Paragraph heading = new Paragraph("FINAL BATCH OUTCOME BREAKDOWN", FONT_SECTION_TITLE);
        heading.setSpacingBefore(8);
        heading.setSpacingAfter(6);
        document.add(heading);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{60, 40});
        table.setSpacingAfter(10);

        addTableHeader(table, new String[]{"Performance Metric", "Authoritative Outcome Value"});

        addTableRow(table, "Initial Chicks Placed", NUMBER_FMT.format(initialBirds) + " birds", false);
        addTableRow(table, "Cumulative Flock Mortality", NUMBER_FMT.format(totalMortality) + " birds (" + DECIMAL_FMT.format(mortalityPct) + "%)", true);
        addTableRow(table, "Final Live Birds at Batch Close", NUMBER_FMT.format(finalRemainingBirds) + " birds", false);
        addTableRow(table, "Total Birds Marketed / Sold", NUMBER_FMT.format(totalBirdsSold) + " birds", true);
        addTableRow(table, "Final Average Harvest Weight", finalAvgWeightG != null ? DECIMAL_FMT.format(finalAvgWeightG.divide(BigDecimal.valueOf(1000), 2, RoundingMode.HALF_UP)) + " kg (" + NUMBER_FMT.format(finalAvgWeightG) + " g)" : "N/A", false);
        addTableRow(table, "Total Feed Consumed", DECIMAL_FMT.format(totalFeedConsumedKg) + " kg", true);
        addTableRow(table, "Authoritative Final FCR", finalFcr != null ? FCR_FMT.format(finalFcr) : "N/A", false);
        addTableRow(table, "Total Batch Rearing Cycle", durationDays + " Days", true);

        document.add(table);
    }

    private void addSalesReportTable(Document document, List<Sale> sales) throws DocumentException {
        if (sales.isEmpty()) {
            addEmptyState(document, "No sales transactions recorded for this batch.");
            return;
        }

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{14, 20, 12, 14, 13, 13, 14});
        table.setHeaderRows(1);
        table.setSpacingAfter(12);

        addTableHeader(table, new String[]{
                "Date", "Trader / Buyer", "Birds Sold", "Total Wt (kg)", "Avg Wt (kg)", "Rate/kg", "Revenue"
        });

        int totalBirdsSold = 0;
        BigDecimal totalWeightKg = BigDecimal.ZERO;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        boolean isAlt = false;
        for (Sale s : sales) {
            int birds = s.getBirdsSold() != null ? s.getBirdsSold() : 0;
            BigDecimal weight = s.getTotalWeightKg() != null ? s.getTotalWeightKg() : BigDecimal.ZERO;
            BigDecimal rev = s.getRevenue() != null ? s.getRevenue()
                    : (s.getRatePerKg() != null ? weight.multiply(s.getRatePerKg()) : BigDecimal.ZERO);
            BigDecimal avgWt = s.getAvgWeightPerBirdKg();
            if (avgWt == null && birds > 0) {
                avgWt = weight.divide(BigDecimal.valueOf(birds), 3, RoundingMode.HALF_UP);
            }

            totalBirdsSold += birds;
            totalWeightKg = totalWeightKg.add(weight);
            totalRevenue = totalRevenue.add(rev);

            String dateStr = s.getSaleDate() != null ? s.getSaleDate().format(DATE_FMT) : "—";
            String trader = s.getTraderName() != null && !s.getTraderName().isEmpty() ? s.getTraderName() : "Standard Market";
            String birdsStr = NUMBER_FMT.format(birds);
            String wtStr = DECIMAL_FMT.format(weight) + " kg";
            String avgWtStr = avgWt != null ? DECIMAL_FMT.format(avgWt) + " kg" : "—";
            String rateStr = s.getRatePerKg() != null ? CURRENCY_FMT.format(s.getRatePerKg()) : "—";
            String revStr = CURRENCY_FMT.format(rev);

            addCellWithBackground(table, dateStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, trader, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, birdsStr, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, wtStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, avgWtStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, rateStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, revStr, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);

            isAlt = !isAlt;
        }

        // Totals Row
        BigDecimal avgRate = totalWeightKg.compareTo(BigDecimal.ZERO) > 0
                ? totalRevenue.divide(totalWeightKg, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        addTotalCell(table, "TOTAL SALES", Element.ALIGN_LEFT, 2);
        addTotalCell(table, NUMBER_FMT.format(totalBirdsSold) + " birds", Element.ALIGN_RIGHT, 1);
        addTotalCell(table, DECIMAL_FMT.format(totalWeightKg) + " kg", Element.ALIGN_RIGHT, 1);
        addTotalCell(table, "—", Element.ALIGN_RIGHT, 1);
        addTotalCell(table, CURRENCY_FMT.format(avgRate) + " avg", Element.ALIGN_RIGHT, 1);
        addTotalCell(table, CURRENCY_FMT.format(totalRevenue), Element.ALIGN_RIGHT, 1);

        document.add(table);
    }

    private void addFeedSummaryTable(Document document, List<FeedInventoryItemDto> items) throws DocumentException {
        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{18, 11, 11, 11, 11, 13, 13, 12});
        table.setHeaderRows(1);
        table.setSpacingAfter(14);

        addTableHeader(table, new String[]{
                "Feed Type", "Bag Size", "Loaded Bags", "Used Bags", "Rem. Bags", "Loaded (kg)", "Used (kg)", "Rem. (kg)"
        });

        BigDecimal totalLoadedBags = BigDecimal.ZERO;
        BigDecimal totalUsedBags = BigDecimal.ZERO;
        BigDecimal totalRemBags = BigDecimal.ZERO;
        BigDecimal totalLoadedKg = BigDecimal.ZERO;
        BigDecimal totalUsedKg = BigDecimal.ZERO;
        BigDecimal totalRemKg = BigDecimal.ZERO;

        boolean isAlt = false;
        for (FeedInventoryItemDto item : items) {
            BigDecimal cap = item.getBagCapacityKg() != null ? item.getBagCapacityKg() : BigDecimal.valueOf(50);
            BigDecimal loadedB = item.getLoadedBags() != null ? item.getLoadedBags() : BigDecimal.ZERO;
            BigDecimal usedB = item.getConsumedBags() != null ? item.getConsumedBags() : BigDecimal.ZERO;
            BigDecimal remB = item.getAvailableBags() != null ? item.getAvailableBags() : BigDecimal.ZERO;

            BigDecimal loadedKg = loadedB.multiply(cap);
            BigDecimal usedKg = usedB.multiply(cap);
            BigDecimal remKg = remB.multiply(cap);

            // Skip entries that have zero activity to keep report clean
            if (loadedB.compareTo(BigDecimal.ZERO) == 0 && usedB.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            totalLoadedBags = totalLoadedBags.add(loadedB);
            totalUsedBags = totalUsedBags.add(usedB);
            totalRemBags = totalRemBags.add(remB);
            totalLoadedKg = totalLoadedKg.add(loadedKg);
            totalUsedKg = totalUsedKg.add(usedKg);
            totalRemKg = totalRemKg.add(remKg);

            String type = item.getFeedTypeDisplay() != null ? item.getFeedTypeDisplay() : item.getFeedType();
            String capStr = DECIMAL_FMT.format(cap) + " kg";

            addCellWithBackground(table, type, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, capStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_CENTER);
            addCellWithBackground(table, DECIMAL_FMT.format(loadedB), FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, DECIMAL_FMT.format(usedB), FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, DECIMAL_FMT.format(remB), FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, DECIMAL_FMT.format(loadedKg), FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, DECIMAL_FMT.format(usedKg), FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, DECIMAL_FMT.format(remKg), FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);

            isAlt = !isAlt;
        }

        // Feed Totals Row
        addTotalCell(table, "TOTAL FEED", Element.ALIGN_LEFT, 2);
        addTotalCell(table, DECIMAL_FMT.format(totalLoadedBags), Element.ALIGN_RIGHT, 1);
        addTotalCell(table, DECIMAL_FMT.format(totalUsedBags), Element.ALIGN_RIGHT, 1);
        addTotalCell(table, DECIMAL_FMT.format(totalRemBags), Element.ALIGN_RIGHT, 1);
        addTotalCell(table, DECIMAL_FMT.format(totalLoadedKg) + " kg", Element.ALIGN_RIGHT, 1);
        addTotalCell(table, DECIMAL_FMT.format(totalUsedKg) + " kg", Element.ALIGN_RIGHT, 1);
        addTotalCell(table, DECIMAL_FMT.format(totalRemKg) + " kg", Element.ALIGN_RIGHT, 1);

        document.add(table);
    }

    private void addRecentDailyRecordsTable(Document document, List<DailyRecord> records, LocalDate startDate) throws DocumentException {
        if (records.isEmpty()) {
            addEmptyState(document, "No daily records logged for this batch.");
            return;
        }

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{14, 10, 12, 16, 16, 14, 18});
        table.setHeaderRows(1);
        table.setSpacingAfter(10);

        addTableHeader(table, new String[]{
                "Date", "Flock Age", "Mortality", "Feed Consumed", "Avg Weight", "FCR", "Closing Remaining"
        });

        // Take last 10 records for concise presentation
        int startIdx = Math.max(0, records.size() - 10);
        List<DailyRecord> recent = records.subList(startIdx, records.size());

        boolean isAlt = false;
        for (DailyRecord r : recent) {
            long ageDays = 1;
            if (startDate != null && r.getRecordDate() != null) {
                ageDays = ChronoUnit.DAYS.between(startDate, r.getRecordDate()) + 1;
                if (ageDays < 1) ageDays = 1;
            }

            String dateStr = r.getRecordDate() != null ? r.getRecordDate().format(DATE_FMT) : "—";
            String ageStr = "Day " + ageDays;
            String mortStr = r.getMortality() != null ? NUMBER_FMT.format(r.getMortality()) : "0";
            String feedStr = r.getFeedConsumedKg() != null ? DECIMAL_FMT.format(r.getFeedConsumedKg()) + " kg" : "0.00 kg";
            String avgWeightStr = r.getAvgWeightG() != null ? NUMBER_FMT.format(r.getAvgWeightG()) + " g" : "—";
            String fcrStr = r.getFcr() != null ? FCR_FMT.format(r.getFcr()) : "—";
            String remStr = r.getRemainingBirds() != null ? NUMBER_FMT.format(r.getRemainingBirds()) : "—";

            addCellWithBackground(table, dateStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, ageStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_CENTER);
            addCellWithBackground(table, mortStr, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, feedStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, avgWeightStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, fcrStr, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, remStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);

            isAlt = !isAlt;
        }

        document.add(table);
    }

    private void addVaccinationsTable(Document document, List<Vaccine> vaccines) throws DocumentException {
        if (vaccines.isEmpty()) {
            addEmptyState(document, "No vaccination records logged for this batch.");
            return;
        }

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{18, 32, 15, 35});
        table.setHeaderRows(1);
        table.setSpacingAfter(10);

        addTableHeader(table, new String[]{"Date Administered", "Vaccine Name", "Flock Age", "Clinical Remarks"});

        boolean isAlt = false;
        for (Vaccine v : vaccines) {
            String dateStr = v.getGivenDate() != null ? v.getGivenDate().format(DATE_FMT) : "—";
            String nameStr = v.getVaccineName() != null ? v.getVaccineName() : "—";
            String ageStr = v.getAgeDays() != null ? "Day " + v.getAgeDays() : "—";
            String remarks = v.getRemarks() != null && !v.getRemarks().isEmpty() ? v.getRemarks() : "Standard protocol administered";

            addCellWithBackground(table, dateStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, nameStr, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, ageStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_CENTER);
            addCellWithBackground(table, remarks, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);

            isAlt = !isAlt;
        }

        document.add(table);
    }

    private void addRemarksTable(Document document, List<Remark> remarks) throws DocumentException {
        if (remarks.isEmpty()) {
            addEmptyState(document, "No clinical remarks or supervisory notes recorded.");
            return;
        }

        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{18, 22, 60});
        table.setHeaderRows(1);
        table.setSpacingAfter(10);

        addTableHeader(table, new String[]{"Date", "Recorded By", "Observation / Advisory Note"});

        boolean isAlt = false;
        for (Remark r : remarks) {
            String dateStr = r.getRemarkDate() != null ? r.getRemarkDate().format(DATE_FMT) : "—";
            String userStr = r.getCreatedBy() != null ? r.getCreatedBy().getName() : "Farm Operator";
            String noteStr = r.getNote() != null ? r.getNote() : "—";

            addCellWithBackground(table, dateStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, userStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, noteStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);

            isAlt = !isAlt;
        }

        document.add(table);
    }

    private void addExpensesTable(Document document, List<Expense> expenses) throws DocumentException {
        if (expenses.isEmpty()) {
            addEmptyState(document, "No expense transactions logged for this batch.");
            return;
        }

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{18, 24, 20, 38});
        table.setHeaderRows(1);
        table.setSpacingAfter(14);

        addTableHeader(table, new String[]{"Date", "Expense Category", "Amount ($)", "Description"});

        BigDecimal totalExpenses = BigDecimal.ZERO;
        boolean isAlt = false;

        for (Expense e : expenses) {
            BigDecimal amt = e.getAmount() != null ? e.getAmount() : BigDecimal.ZERO;
            totalExpenses = totalExpenses.add(amt);

            String dateStr = e.getExpenseDate() != null ? e.getExpenseDate().format(DATE_FMT) : "—";
            String catStr = e.getCategory() != null ? e.getCategory().name().replace("_", " ") : "GENERAL";
            String amtStr = CURRENCY_FMT.format(amt);
            String descStr = e.getDescription() != null && !e.getDescription().isEmpty() ? e.getDescription() : "—";

            addCellWithBackground(table, dateStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, catStr, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);
            addCellWithBackground(table, amtStr, FONT_TD_BOLD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_RIGHT);
            addCellWithBackground(table, descStr, FONT_TD, isAlt ? BG_ALT_ROW : Color.WHITE, Element.ALIGN_LEFT);

            isAlt = !isAlt;
        }

        // Totals row
        addTotalCell(table, "TOTAL BATCH EXPENSES", Element.ALIGN_LEFT, 2);
        addTotalCell(table, CURRENCY_FMT.format(totalExpenses), Element.ALIGN_RIGHT, 1);
        addTotalCell(table, "—", Element.ALIGN_LEFT, 1);

        document.add(table);
    }

    private void addSignoffSection(Document document) throws DocumentException {
        Paragraph heading = new Paragraph("AUDIT VERIFICATION & OPERATIONAL SIGN-OFF", FONT_SECTION_TITLE);
        heading.setSpacingBefore(12);
        heading.setSpacingAfter(8);
        document.add(heading);

        PdfPTable signTable = new PdfPTable(2);
        signTable.setWidthPercentage(100);
        signTable.setWidths(new float[]{50, 50});
        signTable.setSpacingAfter(10);

        PdfPCell cell1 = createSignoffBox("FARM MANAGER / OPERATOR", "I hereby certify that the flock numbers, mortality counts, feed inventory records, and sales transactions reported herein represent accurate, verified data.");
        PdfPCell cell2 = createSignoffBox("TECHNICAL SUPERVISOR / INSPECTOR", "Batch closing review completed and validated against standard operational bio-security and production metrics.");

        signTable.addCell(cell1);
        signTable.addCell(cell2);

        document.add(signTable);
    }

    private PdfPCell createSignoffBox(String title, String declaration) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(BG_LIGHT);
        cell.setBorderColor(BORDER_LIGHT);
        cell.setPadding(8);

        Paragraph pTitle = new Paragraph(title, FONT_TD_BOLD);
        pTitle.setSpacingAfter(4);
        cell.addElement(pTitle);

        Paragraph pDecl = new Paragraph(declaration, FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 7, TEXT_MUTED));
        pDecl.setSpacingAfter(18);
        cell.addElement(pDecl);

        Paragraph pSign = new Paragraph("Signature: ___________________________    Date: _______________", FONT_TD);
        cell.addElement(pSign);

        return cell;
    }

    // =========================================================================
    // HELPER TABLE UTILITIES
    // =========================================================================

    private void addTableHeader(PdfPTable table, String[] headers) {
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, FONT_TH));
            cell.setBackgroundColor(PRIMARY_EMERALD);
            cell.setBorderColor(ACCENT_EMERALD);
            cell.setPadding(5);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }
    }

    private void addTableRow(PdfPTable table, String label, String value, boolean isAlt) {
        Color bg = isAlt ? BG_ALT_ROW : Color.WHITE;

        PdfPCell cLabel = new PdfPCell(new Phrase(label, FONT_TD_BOLD));
        cLabel.setBackgroundColor(bg);
        cLabel.setBorderColor(BORDER_LIGHT);
        cLabel.setPadding(5);
        table.addCell(cLabel);

        PdfPCell cVal = new PdfPCell(new Phrase(value, FONT_TD));
        cVal.setBackgroundColor(bg);
        cVal.setBorderColor(BORDER_LIGHT);
        cVal.setPadding(5);
        cVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(cVal);
    }

    private void addCellWithBackground(PdfPTable table, String text, Font font, Color bg, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(BORDER_LIGHT);
        cell.setPadding(5);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addTotalCell(PdfPTable table, String text, int alignment, int colSpan) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FONT_TD_BOLD));
        cell.setBackgroundColor(new Color(220, 252, 231)); // light green
        cell.setBorderColor(ACCENT_EMERALD);
        cell.setPadding(5);
        cell.setColspan(colSpan);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addEmptyState(Document document, String message) throws DocumentException {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingAfter(10);

        PdfPCell cell = new PdfPCell(new Phrase(message, FONT_TD_MUTED));
        cell.setBackgroundColor(BG_LIGHT);
        cell.setBorderColor(BORDER_LIGHT);
        cell.setPadding(8);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        table.addCell(cell);
        document.add(table);
    }

    // =========================================================================
    // HEADER & FOOTER EVENT HANDLER
    // =========================================================================

    private static class PdfPageEventHandler extends PdfPageEventHelper {
        private final String batchCode;
        private PdfTemplate totalPagesTemplate;
        private BaseFont baseFont;

        public PdfPageEventHandler(String batchCode) {
            this.batchCode = batchCode;
        }

        @Override
        public void onOpenDocument(PdfWriter writer, Document document) {
            try {
                totalPagesTemplate = writer.getDirectContent().createTemplate(30, 16);
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            } catch (Exception e) {
                log.error("Failed to initialize PDF template", e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            int pageNum = writer.getPageNumber();

            // Running header on page 2+
            if (pageNum > 1) {
                cb.beginText();
                cb.setFontAndSize(baseFont, 7.5f);
                cb.setColorFill(TEXT_MUTED);
                cb.showTextAligned(Element.ALIGN_LEFT, "Poultry Management System — Batch " + batchCode + " Closing Report", 36, document.top() + 10, 0);
                cb.endText();

                // Thin top line
                cb.setColorStroke(BORDER_LIGHT);
                cb.setLineWidth(0.5f);
                cb.moveTo(36, document.top() + 6);
                cb.lineTo(document.right(), document.top() + 6);
                cb.stroke();
            }

            // Running footer on all pages
            cb.setColorStroke(BORDER_LIGHT);
            cb.setLineWidth(0.5f);
            cb.moveTo(36, document.bottom() - 10);
            cb.lineTo(document.right(), document.bottom() - 10);
            cb.stroke();

            cb.beginText();
            cb.setFontAndSize(baseFont, 7.5f);
            cb.setColorFill(TEXT_MUTED);

            String footerLeft = "Generated by Poultry Management System • Batch: " + batchCode;
            cb.showTextAligned(Element.ALIGN_LEFT, footerLeft, 36, document.bottom() - 22, 0);

            String pageText = "Page " + pageNum + " of ";
            float textWidth = baseFont.getWidthPoint(pageText, 7.5f);
            float xPos = document.right() - 25;
            cb.showTextAligned(Element.ALIGN_RIGHT, pageText, xPos, document.bottom() - 22, 0);
            cb.endText();

            // Add template for total pages
            cb.addTemplate(totalPagesTemplate, xPos, document.bottom() - 22);
        }

        @Override
        public void onCloseDocument(PdfWriter writer, Document document) {
            totalPagesTemplate.beginText();
            totalPagesTemplate.setFontAndSize(baseFont, 7.5f);
            totalPagesTemplate.setColorFill(TEXT_MUTED);
            totalPagesTemplate.showText(String.valueOf(writer.getPageNumber()));
            totalPagesTemplate.endText();
        }
    }
}
