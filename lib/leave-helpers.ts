export const formatLeaveDaysValue = (days: number) => {
  const normalized = Math.round((days + Number.EPSILON) * 100) / 100;
  return Number.isInteger(normalized)
    ? String(normalized)
    : String(normalized)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*[1-9])0+$/, "$1");
};

export function isCompOffLeaveType(leaveType?: { name?: string; code?: string }) {
  const normalizedName = String(leaveType?.name ?? "").trim().toLowerCase();
  const normalizedCode = String(leaveType?.code ?? "").trim().toLowerCase();

  return (
    normalizedName === "comp off" ||
    normalizedName === "compensatory leave" ||
    normalizedCode === "compensatory_leave" ||
    normalizedCode === "compensatory-leave" ||
    normalizedCode === "compensatory"
  );
}

export function getDisplayLeaveTypeName(name: string) {
  const normalizedName = name.trim().toLowerCase();
  if (normalizedName === "comp off") {
    return "Compensatory Leave";
  }
  return name;
}

export const getLeaveCategory = (leaveCode?: string, leaveName?: string) => {
  const normalizedCode = String(leaveCode ?? "")
    .trim()
    .toUpperCase();
  const normalizedName = String(leaveName ?? "")
    .trim()
    .toLowerCase();

  const isEarnedLeave =
    normalizedCode === "CL" ||
    normalizedCode === "WL" ||
    normalizedName === "comp off" ||
    normalizedName === "casual leave" ||
    normalizedName === "wellness leave";

  return isEarnedLeave
    ? {
        label: "Earned Leave",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      }
    : {
        label: "Special Leave",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
};
