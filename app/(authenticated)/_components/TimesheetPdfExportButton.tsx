"use client";

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MonthlyTimesheetResponse } from "@/lib/dashboard-type";

type TimesheetPdfExportButtonProps = {
  monthlyData: MonthlyTimesheetResponse | null;
  isLoading: boolean;
  isTeamMode: boolean;
  userEmail?: string;
};

const toDisplayLabel = (value?: string) => {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export function TimesheetPdfExportButton({
  monthlyData,
  isLoading,
  isTeamMode,
  userEmail,
}: TimesheetPdfExportButtonProps) {
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const handleExportCycleToPdf = async () => {
    if (isTeamMode) {
      return;
    }
    if (!monthlyData) {
      toast.error("No monthly timesheet data available");
      return;
    }
    setIsPdfExporting(true);
    try {
      const toAscii = (value: string) => value.replace(/[^\x20-\x7E]/g, "?");
      const escapePdfText = (value: string) =>
        toAscii(value)
          .replace(/\\/g, "\\\\")
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)");
      const padCell = (value: string, width: number) => {
        const trimmed = value.trim();
        if (trimmed.length >= width) return `${trimmed.slice(0, width - 1)}~`;
        return `${trimmed}${" ".repeat(width - trimmed.length)}`;
      };
      const wrapText = (value: string, width: number) => {
        const text = value.trim();
        if (!text) return ["-"];
        const result: string[] = [];
        let cursor = 0;
        while (cursor < text.length) {
          result.push(text.slice(cursor, cursor + width));
          cursor += width;
        }
        return result;
      };

      const formatDate = (value: string) => {
        const parsed = parseISO(value);
        if (!isValid(parsed)) return value;
        return format(parsed, "dd/MM/yyyy");
      };

      const getCycleRows = (data: MonthlyTimesheetResponse) => {
        const rows: Array<{
          date: string;
          day: string;
          department: string;
          projectType: string;
          activity: string;
          hours: string;
          status: string;
        }> = [];

        const sortedDays = [...data.days].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        sortedDays.forEach((day) => {
          const parsedDate = parseISO(day.date);
          const dayName = isValid(parsedDate) ? format(parsedDate, "EEEE") : "-";
          const rowDate = formatDate(day.date);
          const dayOfMonth = isValid(parsedDate) ? parsedDate.getDate() : 0;
          const weekOfMonth = Math.ceil(dayOfMonth / 7);
          const isSaturday = dayName === "Saturday";
          const is2ndOr4thSaturday =
            isSaturday && (weekOfMonth === 2 || weekOfMonth === 4);
          const isSunday = dayName === "Sunday";
          const isWeekendOff = is2ndOr4thSaturday || isSunday;

          const timesheetEntries = day.timesheet?.entries ?? [];
          const leaveEntries = day.leaves?.entries ?? [];

          if (timesheetEntries.length > 0) {
            timesheetEntries.forEach((entry) => {
              rows.push({
                date: rowDate,
                day: dayName,
                department: entry.departmentName || "-",
                projectType: entry.projectName || "-",
                activity: entry.taskDescription || "-",
                hours: String(entry.hours ?? 0),
                status: toDisplayLabel(day.timesheet?.state) || "Submitted",
              });
            });
          }

          if (leaveEntries.length > 0) {
            leaveEntries.forEach((entry) => {
              const leaveType = entry.leaveType?.name || "Leave";
              const leaveStatus = toDisplayLabel(entry.state) || "Approved";
              rows.push({
                date: rowDate,
                day: dayName,
                department: "-",
                projectType: `${leaveType} (${leaveStatus})`,
                activity: entry.reason?.trim() || "-",
                hours: String(entry.hours ?? 0),
                status: leaveStatus,
              });
            });
          }

          if (
            timesheetEntries.length === 0 &&
            leaveEntries.length === 0 &&
            (isWeekendOff || day.isHoliday)
          ) {
            const activity = day.isHoliday
              ? day.holidayName
                ? `Holiday (${day.holidayName})`
                : "Holiday"
              : isSunday
                ? "Sunday"
                : "Saturday (Off)";
            rows.push({
              date: rowDate,
              day: dayName,
              department: "-",
              projectType: "-",
              activity,
              hours: "0",
              status: "Off Day",
            });
          }

          if (
            timesheetEntries.length === 0 &&
            leaveEntries.length === 0 &&
            !isWeekendOff &&
            !day.isHoliday
          ) {
            rows.push({
              date: rowDate,
              day: dayName,
              department: "-",
              projectType: "-",
              activity: "-",
              hours: "0",
              status: "Pending",
            });
          }
        });

        return rows;
      };

      const cycleRows = getCycleRows(monthlyData);
      const periodStart = formatDate(monthlyData.period.start);
      const periodEnd = formatDate(monthlyData.period.end);
      const contentLines: string[] = [
        "TIMESHEET - SALARY CYCLE",
        `User Email: ${userEmail || "N/A"}`,
        `Cycle Range: ${periodStart} - ${periodEnd}`,
        `Total Rows: ${cycleRows.length}`,
        "",
        `${padCell("S.No", 6)}${padCell("Date", 12)}${padCell("Day", 12)}${padCell("Dept", 18)}${padCell("Project/Type", 24)}${padCell("Hours", 8)}${padCell("Status", 12)}Activity`,
        "------------------------------------------------------------------------------------------------------------------------",
      ];

      cycleRows.forEach((row, index) => {
        const activityLines = wrapText(row.activity, 70);
        activityLines.forEach((activityLine, lineIndex) => {
          if (lineIndex === 0) {
            contentLines.push(
              `${padCell(String(index + 1), 6)}${padCell(row.date, 12)}${padCell(row.day, 12)}${padCell(row.department, 18)}${padCell(row.projectType, 24)}${padCell(row.hours, 8)}${padCell(row.status, 12)}${activityLine}`
            );
            return;
          }

          contentLines.push(
            `${padCell("", 6)}${padCell("", 12)}${padCell("", 12)}${padCell("", 18)}${padCell("", 24)}${padCell("", 8)}${padCell("", 12)}${activityLine}`
          );
        });
      });

      const linesPerPage = 42;
      const pages: string[][] = [];
      for (let i = 0; i < contentLines.length; i += linesPerPage) {
        pages.push(contentLines.slice(i, i + linesPerPage));
      }

      const objects: string[] = [""];
      const addObject = (content: string) => {
        objects.push(content);
        return objects.length - 1;
      };

      const catalogObjectNumber = 1;
      const pagesObjectNumber = 2;
      const fontObjectNumber = 3;

      objects[catalogObjectNumber] = "";
      objects[pagesObjectNumber] = "";
      objects[fontObjectNumber] =
        "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

      const pageObjectNumbers: number[] = [];

      pages.forEach((pageLines) => {
        let stream = "BT\n/F1 9 Tf\n36 560 Td\n";
        pageLines.forEach((line, index) => {
          if (index === 0) {
            stream += `(${escapePdfText(line)}) Tj\n`;
          } else {
            stream += `0 -12 Td\n(${escapePdfText(line)}) Tj\n`;
          }
        });
        stream += "ET";

        const contentObjectNumber = addObject(
          `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
        );

        const pageObjectNumber = addObject(
          `<< /Type /Page /Parent ${pagesObjectNumber} 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
        );

        pageObjectNumbers.push(pageObjectNumber);
      });

      objects[catalogObjectNumber] = `<< /Type /Catalog /Pages ${pagesObjectNumber} 0 R >>`;
      objects[pagesObjectNumber] = `<< /Type /Pages /Kids [${pageObjectNumbers
        .map((objNo) => `${objNo} 0 R`)
        .join(" ")}] /Count ${pageObjectNumbers.length} >>`;

      let pdf = "%PDF-1.4\n";
      const offsets: number[] = [0];

      for (let i = 1; i < objects.length; i += 1) {
        offsets[i] = pdf.length;
        pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
      }

      const startXref = pdf.length;
      pdf += `xref\n0 ${objects.length}\n`;
      pdf += "0000000000 65535 f \n";

      for (let i = 1; i < objects.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
      }

      pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogObjectNumber} 0 R >>\n`;
      pdf += `startxref\n${startXref}\n%%EOF`;

      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `timesheet-${periodStart}-to-${periodEnd}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Timesheet PDF downloaded successfully");
    } catch (err: unknown) {
      console.error("Error exporting timesheet PDF:", err);
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error("Export failed", {
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to export timesheet PDF",
      });
    } finally {
      setIsPdfExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportCycleToPdf}
      disabled={isLoading || !monthlyData || isPdfExporting}
      className="h-8"
    >
      <FileDown className="h-3.5 w-3.5" />
      {isPdfExporting ? "Exporting..." : "Export to PDF"}
    </Button>
  );
}
