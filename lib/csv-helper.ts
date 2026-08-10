import { SalarySummaryRow } from "@/lib/config";

export interface CsvHeader<T> {
  key: keyof T;
  label: string;
  format?: (value: any) => string;
}

const formatDateString = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export function exportToCsv<T>(
  headers: CsvHeader<T>[],
  data: T[],
  filename: string
) {
  const headerRow = headers.map((h) => `"${String(h.label).replace(/"/g, '""')}"`).join(",");
  const bodyRows = data.map((item) =>
    headers
      .map((h) => {
        const val = item[h.key];
        const formattedVal = h.format ? h.format(val) : val;
        const strVal = formattedVal === null || formattedVal === undefined ? "" : String(formattedVal);
        return `"${strVal.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = [headerRow, ...bodyRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportSalarySummaryCsv(data: SalarySummaryRow[], filename: string) {
  const headers: CsvHeader<SalarySummaryRow>[] = [
    { key: "userId", label: "User ID" },
    { key: "email", label: "Employee Email" },
    { key: "employmentType", label: "Employment Type", format: (v) => v || "Not Specified" },
    { key: "joiningDate", label: "Joining Date", format: formatDateString },
    { key: "exitDate", label: "Exit Date", format: formatDateString },
    { key: "status", label: "Status" },
    { key: "expectedAttendance", label: "Expected Attendance" },
    { key: "cycle", label: "Cycle", format: formatDateString },
    { key: "totalHours", label: "Total Hours" },
    { key: "totalWorkingDays", label: "Working Days" },
    { key: "earnLeave", label: "Earned Leave" },
    { key: "specialLeave", label: "Special Leave" },
    { key: "compOffLeaves", label: "Comp-off Leaves" },
    { key: "weekOff", label: "Week Off" },
    { key: "totalPayableDays", label: "Payable Days" },
    { key: "lwp", label: "LWP" },
  ];
  exportToCsv(headers, data, filename);
}
