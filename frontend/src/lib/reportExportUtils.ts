import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CeoMultiFarmReportResponse } from "@/types/ceoReport";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export interface ExportFilterInfo {
  farmName?: string;
  batchStatus?: string;
  startDate?: string;
  endDate?: string;
}

export function exportReportToCsv(
  report: CeoMultiFarmReportResponse,
  filters?: ExportFilterInfo
) {
  const todayStr = new Date().toISOString().split("T")[0];
  const rows: string[][] = [];

  // Metadata headers
  rows.push(["CEO MULTI-FARM EXECUTIVE REPORT"]);
  rows.push(["Generated On", new Date().toLocaleString()]);
  rows.push([
    "Filters Applied",
    `Farm: ${filters?.farmName || "All Farms"} | Status: ${filters?.batchStatus || "All Statuses"} | Start: ${filters?.startDate || "All"} | End: ${filters?.endDate || "All"}`,
  ]);
  rows.push([]);

  // Network KPIs Section
  rows.push(["--- NETWORK KPI SUMMARY ---"]);
  rows.push([
    "Total Farms",
    "Active Batches",
    "Completed Batches",
    "Total Birds",
    "Live Remaining Birds",
    "Total Mortality",
    "Mortality %",
    "Average FCR",
    "Total Feed (kg)",
    "Total Revenue ($)",
  ]);
  rows.push([
    String(report.networkKpis.totalFarms),
    String(report.networkKpis.totalActiveBatches),
    String(report.networkKpis.totalCompletedBatches),
    String(report.networkKpis.totalInitialBirds),
    String(report.networkKpis.totalRemainingBirds),
    String(report.networkKpis.totalMortality),
    `${report.networkKpis.networkMortalityPct}%`,
    report.networkKpis.averageFcr != null ? String(report.networkKpis.averageFcr) : "N/A",
    String(report.networkKpis.totalFeedConsumedKg),
    `$${report.networkKpis.totalRevenue.toLocaleString()}`,
  ]);
  rows.push([]);

  // Farm Comparison Section
  rows.push(["--- COMPARATIVE FARM RANKINGS ---"]);
  rows.push([
    "Farm ID",
    "Farm Name",
    "Location",
    "Farmer Name",
    "Active Batches",
    "Total Batches",
    "Total Birds",
    "Remaining Birds",
    "Mortality",
    "Mortality %",
    "Avg Weight (g)",
    "Avg FCR",
    "Feed Consumed (kg)",
    "Revenue ($)",
    "Performance Status",
    "Performance Note",
  ]);

  report.farmRankings.forEach((farm) => {
    rows.push([
      String(farm.farmId),
      farm.farmName,
      farm.farmLocation || "",
      farm.farmerName || "",
      String(farm.activeBatchesCount),
      String(farm.totalBatchesCount),
      String(farm.totalBirds),
      String(farm.remainingBirds),
      String(farm.totalMortality),
      `${farm.mortalityPct}%`,
      farm.avgWeightG != null ? `${farm.avgWeightG}g` : "N/A",
      farm.avgFcr != null ? String(farm.avgFcr) : "N/A",
      String(farm.totalFeedConsumedKg),
      `$${farm.totalRevenue.toLocaleString()}`,
      farm.performanceStatus,
      farm.performanceNote,
    ]);
  });
  rows.push([]);

  // Batch Breakdown Section
  rows.push(["--- DETAILED BATCH RECORDS ---"]);
  rows.push([
    "Batch ID",
    "Batch Code",
    "Farm Name",
    "Farmer Name",
    "Status",
    "Start Date",
    "End Date",
    "Initial Birds",
    "Remaining Birds",
    "Mortality",
    "Mortality %",
    "Latest Avg Weight (g)",
    "Latest FCR",
    "Feed Consumed (kg)",
    "Revenue ($)",
  ]);

  report.batchReports.forEach((batch) => {
    rows.push([
      String(batch.batchId),
      batch.batchCode,
      batch.farmName,
      batch.farmerName,
      batch.status,
      batch.startDate || "",
      batch.endDate || "",
      String(batch.initialBirds),
      String(batch.remainingBirds),
      String(batch.totalMortality),
      `${batch.mortalityPct}%`,
      batch.latestAvgWeightG != null ? `${batch.latestAvgWeightG}g` : "N/A",
      batch.latestFcr != null ? String(batch.latestFcr) : "N/A",
      String(batch.totalFeedConsumedKg),
      `$${batch.totalRevenue.toLocaleString()}`,
    ]);
  });

  const csvContent = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `ceo-farm-report-${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToPdf(
  report: CeoMultiFarmReportResponse,
  filters?: ExportFilterInfo
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const primaryColor: [number, number, number] = [6, 78, 59]; // Emerald 900
  const headerBg: [number, number, number] = [16, 185, 129]; // Emerald 500

  // Document Title & Metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.text("POULTRY NETWORK MANAGEMENT - CEO EXECUTIVE REPORT", 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 56);
  doc.text(
    `Filters: Farm: ${filters?.farmName || "All Farms"} | Batch Status: ${filters?.batchStatus || "All"} | Date Range: ${filters?.startDate || "All"} to ${filters?.endDate || "All"}`,
    40,
    68
  );

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 76, 802, 76);

  // Network KPI Table Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("Network Executive Overview", 40, 96);

  autoTable(doc, {
    startY: 104,
    theme: "grid",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    head: [
      [
        "Total Farms",
        "Active Batches",
        "Completed Batches",
        "Total Birds",
        "Live Remaining",
        "Mortality (Birds / %)",
        "Avg FCR",
        "Total Feed Consumed",
        "Total Revenue",
      ],
    ],
    body: [
      [
        String(report.networkKpis.totalFarms),
        String(report.networkKpis.totalActiveBatches),
        String(report.networkKpis.totalCompletedBatches),
        report.networkKpis.totalInitialBirds.toLocaleString(),
        report.networkKpis.totalRemainingBirds.toLocaleString(),
        `${report.networkKpis.totalMortality.toLocaleString()} (${report.networkKpis.networkMortalityPct}%)`,
        report.networkKpis.averageFcr != null ? String(report.networkKpis.averageFcr) : "N/A",
        `${report.networkKpis.totalFeedConsumedKg.toLocaleString()} kg`,
        `$${report.networkKpis.totalRevenue.toLocaleString()}`,
      ],
    ],
  });

  // Comparative Farm Ranking Table
  // @ts-expect-error jspdf-autotable extends jsPDF instance with lastAutoTable
  const currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 24 : 170;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text("Comparative Farm Performance Rankings", 40, currentY);

  const farmRows = report.farmRankings.map((farm, index) => [
    `#${index + 1}`,
    farm.farmName,
    farm.farmLocation,
    farm.farmerName,
    `${farm.activeBatchesCount} / ${farm.totalBatchesCount}`,
    farm.totalBirds.toLocaleString(),
    `${farm.totalMortality.toLocaleString()} (${farm.mortalityPct}%)`,
    farm.avgWeightG != null ? `${farm.avgWeightG} g` : "—",
    farm.avgFcr != null ? String(farm.avgFcr) : "—",
    `${farm.totalFeedConsumedKg.toLocaleString()} kg`,
    `$${farm.totalRevenue.toLocaleString()}`,
    farm.performanceStatus,
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    head: [
      [
        "Rank",
        "Farm Name",
        "Location",
        "Farmer",
        "Batches (Act/Tot)",
        "Total Birds",
        "Mortality",
        "Avg Weight",
        "Avg FCR",
        "Feed Consumed",
        "Revenue",
        "Status",
      ],
    ],
    body: farmRows.length > 0 ? farmRows : [["No farm data found", "", "", "", "", "", "", "", "", "", "", ""]],
  });

  // Detailed Batch Table (on next page if needed)
  // @ts-expect-error jspdf-autotable extends jsPDF instance with lastAutoTable
  const nextY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 24 : 320;

  if (nextY > 460) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("Detailed Batch Performance Records", 40, 40);

    const batchRows = report.batchReports.map((b) => [
      b.batchCode,
      b.farmName,
      b.status,
      b.startDate ? new Date(b.startDate).toLocaleDateString() : "—",
      b.initialBirds.toLocaleString(),
      b.remainingBirds.toLocaleString(),
      `${b.totalMortality.toLocaleString()} (${b.mortalityPct}%)`,
      b.latestAvgWeightG != null ? `${b.latestAvgWeightG} g` : "—",
      b.latestFcr != null ? String(b.latestFcr) : "—",
      `${b.totalFeedConsumedKg.toLocaleString()} kg`,
      `$${b.totalRevenue.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: 48,
      theme: "striped",
      headStyles: {
        fillColor: headerBg,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      head: [
        [
          "Batch Code",
          "Farm Name",
          "Status",
          "Start Date",
          "Initial Birds",
          "Live Birds",
          "Mortality",
          "Latest Weight",
          "FCR",
          "Feed Consumed",
          "Revenue",
        ],
      ],
      body: batchRows.length > 0 ? batchRows : [["No batch records found", "", "", "", "", "", "", "", "", "", ""]],
    });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("Detailed Batch Performance Records", 40, nextY);

    const batchRows = report.batchReports.map((b) => [
      b.batchCode,
      b.farmName,
      b.status,
      b.startDate ? new Date(b.startDate).toLocaleDateString() : "—",
      b.initialBirds.toLocaleString(),
      b.remainingBirds.toLocaleString(),
      `${b.totalMortality.toLocaleString()} (${b.mortalityPct}%)`,
      b.latestAvgWeightG != null ? `${b.latestAvgWeightG} g` : "—",
      b.latestFcr != null ? String(b.latestFcr) : "—",
      `${b.totalFeedConsumedKg.toLocaleString()} kg`,
      `$${b.totalRevenue.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: nextY + 8,
      theme: "striped",
      headStyles: {
        fillColor: headerBg,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      head: [
        [
          "Batch Code",
          "Farm Name",
          "Status",
          "Start Date",
          "Initial Birds",
          "Live Birds",
          "Mortality",
          "Latest Weight",
          "FCR",
          "Feed Consumed",
          "Revenue",
        ],
      ],
      body: batchRows.length > 0 ? batchRows : [["No batch records found", "", "", "", "", "", "", "", "", "", ""]],
    });
  }

  doc.save(`ceo-farm-report-${todayStr}.pdf`);
}
