"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle, Plus, Upload, Trash2, FileText } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import apiClient from "@/lib/api-client";
import { API_PATHS, DATE_FORMATS } from "@/lib/constants";
import { mockDataService } from "@/lib/mock-data";
import {
  checkLeaveConflictWithTimesheet,
  invalidateMonthlyTimesheetCache,
  calculateLeaveDays,
} from "@/lib/leave-timesheet-validator";
import { cn } from "@/lib/utils";
import {
  LeaveTypeWithBalance,
  RawLeaveType,
  RawLeaveBalance,
  FileUploadFieldProps,
  NewLeaveRequestDialogProps,
} from "@/lib/leave-types";

const formSchema = z
  .object({
    employeeEmail: z.string().email(),
    leaveType: z.string().min(1, "Please select a leave type."),
    startDate: z.date({
      message: "Start date is required.",
    }),
    endDate: z.date({
      message: "End date is required.",
    }),
    durationType: z.string().min(1, "Please select a duration type."),
    halfDaySegment: z.string().optional(),
    
    // Bereavement fields
    bereavementRelationship: z.string().optional(),
    bereavementRelationshipOther: z.string().optional(),
    
    // Wedding fields
    weddingCardImage: z.any().optional(),
    
    // Election fields
    voterIdImage: z.any().optional(),
    
    // Exam / L&D fields
    examCourseName: z.string().optional(),
    examHallTicket: z.any().optional(),
    
    // Vipassana fields
    vipassanaDocuments: z.array(z.any()).optional(),
  })
  .superRefine((data, ctx) => {
    const code = (data.leaveType || "").toLowerCase().trim();
    const isBereavement = code.includes("bereavement") || code === "bl";
    const isWedding = code.includes("wedding") || code === "wd" || code === "wdl";
    const isExam = code.includes("exam") || code === "ex" || code === "el";
    const isElection = (code.includes("election") || code === "ecl") && !isExam;
    const isLAndD = code.includes("lnd") || code.includes("l&d") || code.includes("learning") || code === "ld" || code === "ldl";
    const isVipassanaCourse = code.includes("vipassana_course") || code.includes("vipassana-course") || code.includes("vipassana course") || code === "vcl";
    const isVipassanaSeva = code.includes("vipassana_seva") || code.includes("vipassana-seva") || code.includes("vipassana seva") || code === "vs";

    // 1. Date Range
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date.",
        path: ["endDate"],
      });
    }

    // 2. Duration Type & Half Day Segment
    if (data.durationType === "half_day" && !data.halfDaySegment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a half day segment.",
        path: ["halfDaySegment"],
      });
    }

    // 3. Bereavement Validation
    if (isBereavement) {
      if (!data.bereavementRelationship) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Relationship is required.",
          path: ["bereavementRelationship"],
        });
      }
      if (
        data.bereavementRelationship === "Other Immediate Family Member" &&
        !data.bereavementRelationshipOther?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please mention your relationship with them.",
          path: ["bereavementRelationshipOther"],
        });
      }
    }

    // 4. Wedding Validation
    if (isWedding) {
      if (!data.weddingCardImage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Wedding card invitation is required.",
          path: ["weddingCardImage"],
        });
      } else if (data.weddingCardImage instanceof File && data.weddingCardImage.size > 2 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File size must not exceed 2MB.",
          path: ["weddingCardImage"],
        });
      }
    }

    // 5. Election Validation
    if (isElection) {
      if (!data.voterIdImage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Voter ID card is required.",
          path: ["voterIdImage"],
        });
      } else if (data.voterIdImage instanceof File && data.voterIdImage.size > 2 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File size must not exceed 2MB.",
          path: ["voterIdImage"],
        });
      }
    }

    // 6. Exam / L&D Validation
    if (isExam || isLAndD) {
      if (!data.examCourseName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Course or Exam name is required.",
          path: ["examCourseName"],
        });
      }
    }
    if (isExam) {
      if (!data.examHallTicket) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hall ticket or exam schedule image is required.",
          path: ["examHallTicket"],
        });
      } else if (data.examHallTicket instanceof File && data.examHallTicket.size > 2 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File size must not exceed 2MB.",
          path: ["examHallTicket"],
        });
      }
    }

    // 7. Vipassana Validation
    if (isVipassanaCourse || isVipassanaSeva) {
      if (!data.vipassanaDocuments || (Array.isArray(data.vipassanaDocuments) && data.vipassanaDocuments.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one booking confirmation or completion certificate is required.",
          path: ["vipassanaDocuments"],
        });
      } else if (Array.isArray(data.vipassanaDocuments)) {
        for (const file of data.vipassanaDocuments) {
          if (file instanceof File && file.size > 2 * 1024 * 1024) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "File size must not exceed 2MB.",
              path: ["vipassanaDocuments"],
            });
            break;
          }
        }
      }
    }
  });


export function FileUploadField({
  label,
  accept,
  multiple = false,
  value,
  onChange,
  error,
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    if (multiple) {
      const currentFiles = Array.isArray(value) ? value : [];
      const newFiles = [...currentFiles, ...selectedFiles];
      onChange(newFiles);
    } else {
      onChange(selectedFiles[0] || undefined);
    }
  };

  const removeFile = (indexToRemove: number) => {
    if (multiple && Array.isArray(value)) {
      const newFiles = value.filter((_, idx) => idx !== indexToRemove);
      onChange(newFiles.length > 0 ? newFiles : undefined);
    } else {
      onChange(undefined);
    }
  };

  const filesList =
    multiple && Array.isArray(value)
      ? value
      : value instanceof File
        ? [value]
        : [];

  return (
    <div className="space-y-2">
      <FormLabel className="text-sm font-semibold text-foreground">
        {label}
      </FormLabel>
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed border-input rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 hover:border-primary/50 transition duration-200",
          error && "border-destructive hover:border-destructive"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-muted rounded-full text-muted-foreground">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium">
            Click to upload {multiple ? "files" : "a file"}
          </div>
          <div className="text-xs text-muted-foreground">
            {accept.includes("pdf")
              ? "Allowed formats: PDF, Images"
              : "Allowed formats: Images only"}
          </div>
        </div>
      </div>

      {filesList.length > 0 && (
        <div className="mt-3 space-y-2">
          {filesList.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 bg-muted/30 rounded-md border text-sm"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate max-w-[200px] sm:max-w-xs min-w-0">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="text-[0.8rem] font-medium text-destructive">{error}</p>
      )}
    </div>
  );
}


export function NewLeaveRequestDialog({
  userEmail,
  onSuccess,
  forceOpen = false,
  prefilledDate,
}: NewLeaveRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeWithBalance[]>([]);
  const [selectedDurationType, setSelectedDurationType] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const previousLeaveTypeRef = useRef("");

  const durationTypes = mockDataService.getDurationTypes();

  const formatLeaveDaysValue = (days: number) => {
    const normalized = Math.round((days + Number.EPSILON) * 100) / 100;
    return Number.isInteger(normalized)
      ? String(normalized)
      : String(normalized)
        .replace(/\.0+$/, "")
        .replace(/(\.\d*[1-9])0+$/, "$1");
  };

  useEffect(() => {
    if (!forceOpen) return;
    setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    async function fetchLeaveTypes() {
      let balances: RawLeaveBalance[] = [];
      let types: RawLeaveType[] = [];

      try {
        const res = await apiClient.get(API_PATHS.LEAVES_BALANCES);
        balances = Array.isArray(res.data?.balances)
          ? res.data.balances
          : Array.isArray(res.data)
            ? res.data
            : [];
      } catch (error) {
        console.error("Error fetching leave balances:", error);
      }

      try {
        const res2 = await apiClient.get(API_PATHS.LEAVES_TYPES);
        types = Array.isArray(res2.data) ? res2.data : [];
      } catch (error) {
        console.error("Error fetching leave types:", error);
      }

      const mergedList: LeaveTypeWithBalance[] = [];
      const seenCodes = new Set<string>();

      // 1. Process active balances with balanceHours > 0
      balances.forEach((b: RawLeaveBalance) => {
        const lt = b.leaveType || ({} as RawLeaveType);
        const code = (lt.code || "").toLowerCase().trim();
        if (code && (b.balanceHours ?? 0) > 0) {
          seenCodes.add(code);
          mergedList.push({
            id: lt.id ?? b.leaveTypeId,
            code: lt.code,
            name: lt.name,
            paid: lt.paid ?? true,
            requiresApproval: lt.requiresApproval ?? true,
            description: lt.description,
            maxPerRequestHours: lt.maxPerRequestHours,
            balanceHours: b.balanceHours ?? 0,
          });
        }
      });

      // 2. Ensure each of the 4 new leave types is in the list
      const targets = [
        { code: "maternity", name: "Maternity Leave", fallbackId: 101 },
        { code: "parental", name: "Parental Leave", fallbackId: 102 },
        { code: "srs", name: "SRS Leave", fallbackId: 103 },
        { code: "adoption", name: "Adoption Leave", fallbackId: 104 },
      ];

      targets.forEach((target) => {
        // Check if already added via balances
        const isAlreadyAdded = Array.from(seenCodes).some(
          (c) => c === target.code || c.includes(target.code)
        ) || mergedList.some(
          (lt) => lt.name.toLowerCase().trim() === target.name.toLowerCase().trim()
        );

        if (!isAlreadyAdded) {
          // Find in types (fetched from /v1/leaves/types)
          const apiType = types.find(
            (t: RawLeaveType) =>
              (t.code || "").toLowerCase().trim() === target.code ||
              (t.name || "").toLowerCase().trim() === target.name.toLowerCase().trim()
          );

          // Find in balances even if balanceHours <= 0
          const apiBalance = balances.find((b: RawLeaveBalance) => {
            const lt = b.leaveType || ({} as RawLeaveType);
            return (
              (lt.code || "").toLowerCase().trim() === target.code ||
              (lt.name || "").toLowerCase().trim() === target.name.toLowerCase().trim()
            );
          });

          const balanceHours = apiBalance ? (apiBalance.balanceHours ?? 0) : 0;

          if (apiType) {
            mergedList.push({
              id: apiType.id,
              code: apiType.code,
              name: apiType.name,
              paid: apiType.paid ?? true,
              requiresApproval: apiType.requiresApproval ?? true,
              description: apiType.description,
              maxPerRequestHours: apiType.maxPerRequestHours,
              balanceHours,
            });
            seenCodes.add((apiType.code || "").toLowerCase().trim());
          } else if (apiBalance) {
            const lt = apiBalance.leaveType || ({} as RawLeaveType);
            mergedList.push({
              id: lt.id ?? apiBalance.leaveTypeId,
              code: lt.code,
              name: lt.name,
              paid: lt.paid ?? true,
              requiresApproval: lt.requiresApproval ?? true,
              description: lt.description,
              maxPerRequestHours: lt.maxPerRequestHours,
              balanceHours,
            });
            seenCodes.add((lt.code || "").toLowerCase().trim());
          } else {
            // Fallback static type definition
            mergedList.push({
              id: target.fallbackId,
              code: target.code,
              name: target.name,
              paid: true,
              requiresApproval: true,
              description: target.name,
              balanceHours: 0,
            });
            seenCodes.add(target.code);
          }
        }
      });

      if (isMounted) {
        setLeaveTypes(mergedList);
      }
    }
    fetchLeaveTypes();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      employeeEmail: userEmail,
      leaveType: "",
      startDate: undefined,
      endDate: undefined,
      durationType: "",
      halfDaySegment: "",
      bereavementRelationship: "",
      bereavementRelationshipOther: "",
      weddingCardImage: undefined,
      voterIdImage: undefined,
      examCourseName: "",
      examHallTicket: undefined,
      vipassanaDocuments: [],
    },
  });

  const watchLeaveType = form.watch("leaveType");
  const watchBereavementRelationship = form.watch("bereavementRelationship");

  const selectedType = leaveTypes.find((t) => t.code === watchLeaveType);
  const typeName = selectedType?.name.toLowerCase().trim() || "";
  const typeCode = selectedType?.code.toLowerCase().trim() || "";

  const isBereavement = typeName.includes("bereavement") || typeCode === "bl";
  const isWedding = typeName.includes("wedding") || typeCode === "wd" || typeCode === "wdl";
  const isExam = typeName.includes("exam") || typeCode === "ex" || typeCode === "el";
  const isElection = (typeName.includes("election") || typeCode === "ecl") && !isExam;
  const isLAndD = typeName.includes("lnd") || typeName.includes("l&d") || typeName.includes("learning") || typeCode === "ld" || typeCode === "ldl";
  const isVipassanaCourse = typeName.includes("vipassana_course") || typeName.includes("vipassana-course") || typeName.includes("vipassana course") || typeCode === "vcl";
  const isVipassanaSeva = typeName.includes("vipassana_seva") || typeName.includes("vipassana-seva") || typeName.includes("vipassana seva") || typeCode === "vs";

  // Reset all fields whenever leaveType changes (on selecting leave type)
  useEffect(() => {
    if (!open) {
      previousLeaveTypeRef.current = "";
      return;
    }

    if (!watchLeaveType) return;

    const isFirstSelection = previousLeaveTypeRef.current === "";
    const hasPrefilledDate = !!prefilledDate;
    const shouldResetDates = !isFirstSelection || !hasPrefilledDate;

    if (shouldResetDates) {
      form.setValue("startDate", undefined as unknown as Date);
      form.setValue("endDate", undefined as unknown as Date);
      setDateRange(undefined);
    }

    form.setValue("durationType", "");
    form.setValue("halfDaySegment", "");
    form.setValue("bereavementRelationship", "");
    form.setValue("bereavementRelationshipOther", "");
    form.setValue("weddingCardImage", undefined);
    form.setValue("voterIdImage", undefined);
    form.setValue("examCourseName", "");
    form.setValue("examHallTicket", undefined);
    form.setValue("vipassanaDocuments", []);
    setSelectedDurationType("");
    setValidationError(null);

    previousLeaveTypeRef.current = watchLeaveType;
  }, [watchLeaveType, open, prefilledDate, form]);

  useEffect(() => {
    if (!open || !prefilledDate) return;

    const parsed = new Date(`${prefilledDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;

    setDateRange({ from: parsed, to: parsed });
    form.setValue("startDate", parsed, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("endDate", parsed, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, open, prefilledDate]);

  useEffect(() => {
    if (!open) {
      form.reset({
        employeeEmail: userEmail,
        leaveType: "",
        startDate: undefined,
        endDate: undefined,
        durationType: "",
        halfDaySegment: "",
        bereavementRelationship: "",
        bereavementRelationshipOther: "",
        weddingCardImage: undefined,
        voterIdImage: undefined,
        examCourseName: "",
        examHallTicket: undefined,
        vipassanaDocuments: [],
      });
      setSelectedDurationType("");
      setValidationError(null);
      setDateRange(undefined);
      setDateRangeOpen(false);
    }
  }, [open, userEmail, form]);


  const validateLeaveConflict = useCallback(
    async (startDate?: Date, endDate?: Date, durationType?: string) => {
      if (!startDate || !endDate || !durationType) {
        setValidationError(null);
        return;
      }
      setIsValidating(true);
      setValidationError(null);
      try {
        const result = await checkLeaveConflictWithTimesheet(
          startDate,
          endDate,
          durationType as "full_day" | "half_day"
        );
        if (result.hasConflict) {
          setValidationError(result.message || "Conflict detected");
        } else {
          setValidationError(null);
        }
      } catch {
        setValidationError(null);
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchDurationType = form.watch("durationType");

  useEffect(() => {
    if (isElection) return; // Managed separately for single date picker
    if (dateRange?.from && dateRange?.to) {
      form.setValue("startDate", dateRange.from, { shouldValidate: true });
      form.setValue("endDate", dateRange.to, { shouldValidate: true });
    } else if (dateRange?.from && !dateRange?.to) {
      form.setValue("startDate", dateRange.from, { shouldValidate: true });
      form.setValue("endDate", dateRange.from, { shouldValidate: true });
    }
  }, [dateRange, form, isElection]);

  useEffect(() => {
    const id = setTimeout(() => {
      validateLeaveConflict(watchStartDate, watchEndDate, watchDurationType);
    }, 500);
    return () => clearTimeout(id);
  }, [watchStartDate, watchEndDate, watchDurationType, validateLeaveConflict]);

  const handleSingleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange({ from: date, to: date });
      form.setValue("startDate", date, { shouldValidate: true, shouldDirty: true });
      form.setValue("endDate", date, { shouldValidate: true, shouldDirty: true });
      setDateRangeOpen(false);
    } else {
      setDateRange(undefined);
      form.setValue("startDate", undefined as any, { shouldValidate: true, shouldDirty: true });
      form.setValue("endDate", undefined as any, { shouldValidate: true, shouldDirty: true });
    }
  };

  const disabledDates = (date: Date) => {
    if (date < new Date(1900, 0, 1)) return true;
    return false;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const selectedLeaveType = leaveTypes.find(
        (t) => t.code === values.leaveType
      );
      if (!selectedLeaveType) {
        toast.error("Invalid leave type selected");
        setIsSubmitting(false);
        return;
      }

      const conflict = await checkLeaveConflictWithTimesheet(
        values.startDate,
        values.endDate,
        values.durationType as "full_day" | "half_day"
      );
      if (conflict.hasConflict) {
        toast.error("Conflict with timesheet entries", {
          description: conflict.message,
        });
        setIsSubmitting(false);
        return;
      }

      // Calculate working hours excluding off-days and holidays
      const netDays = await calculateLeaveDays(values.startDate, values.endDate);

      if (netDays === 0) {
        toast.error("Selected date range consists only of non-working days or holidays");
        setIsSubmitting(false);
        return;
      }

      let hours = 0;
      if (values.durationType === "full_day") {
        hours = netDays * 8;
      } else if (values.durationType === "half_day") {
        hours = netDays * 4;
      }

      const code = (selectedLeaveType.code || "").toLowerCase().trim();

      const isBereavement = code.includes("bereavement") || code === "bl";
      const isWedding = code.includes("wedding") || code === "wd" || code === "wdl";
      const isExam = code.includes("exam") || code === "ex" || code === "el";
      const isElection = (code.includes("election") || code === "ecl") && !isExam;
      const isLAndD = code.includes("lnd") || code.includes("l&d") || code.includes("learning") || code === "ld" || code === "ldl";
      const isVipassanaCourse = code.includes("vipassana_course") || code.includes("vipassana-course") || code.includes("vipassana course") || code === "vcl";
      const isVipassanaSeva = code.includes("vipassana_seva") || code.includes("vipassana-seva") || code.includes("vipassana seva") || code === "vs";

      const formData = new FormData();
      formData.append("leaveTypeId", String(selectedLeaveType.id));
      formData.append("startDate", format(values.startDate, DATE_FORMATS.API));
      formData.append("endDate", format(values.endDate, DATE_FORMATS.API));
      formData.append("hours", String(hours));
      formData.append("durationType", values.durationType);
      
      if (values.durationType === "half_day" && values.halfDaySegment) {
        formData.append("halfDaySegment", values.halfDaySegment);
      }

      if (isBereavement) {
        if (values.bereavementRelationship) {
          formData.append("relationship", values.bereavementRelationship);
        }
        if (values.bereavementRelationshipOther) {
          formData.append("relationshipDetails", values.bereavementRelationshipOther);
        }
      }

      if (isWedding && values.weddingCardImage) {
        formData.append("document", values.weddingCardImage);
      }

      if (isElection && values.voterIdImage) {
        formData.append("document", values.voterIdImage);

      }

      if (isExam) {
        if (values.examCourseName) {
          formData.append("courseOrProgrammeName", values.examCourseName);
        }
        if (values.examHallTicket) {
          formData.append("document", values.examHallTicket);
        }
      }

      if (isLAndD) {
        if (values.examCourseName) {
          formData.append("courseOrProgrammeName", values.examCourseName);
        }
        if (values.examHallTicket) {
          formData.append("document", values.examHallTicket);
        }
      }

      if ((isVipassanaCourse || isVipassanaSeva) && values.vipassanaDocuments) {
        const docs = Array.isArray(values.vipassanaDocuments)
          ? values.vipassanaDocuments
          : [values.vipassanaDocuments];
        docs.forEach((doc) => {
          if (doc instanceof File) {
            formData.append("document", doc);
          }
        });
      }

      // Verify that files are present in the final payload before submission
      const filesInPayload: string[] = [];
      formData.forEach((value, key) => {
        if (value instanceof File) {
          filesInPayload.push(`${key}: File(${value.name}, ${value.size} bytes)`);
        }
      });

      const response = await apiClient.post(
        API_PATHS.LEAVES_REQUESTS_POST,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.status === 200 || response.status === 201) {
        toast.success("Leave request submitted successfully!");
        const submittedDate = format(values.startDate, DATE_FORMATS.API);
        invalidateMonthlyTimesheetCache(
          values.startDate.getFullYear(),
          values.startDate.getMonth() + 1
        );
        if (values.startDate.getMonth() !== values.endDate.getMonth()) {
          invalidateMonthlyTimesheetCache(
            values.endDate.getFullYear(),
            values.endDate.getMonth() + 1
          );
        }
        form.reset({
          employeeEmail: userEmail,
          leaveType: "",
          startDate: undefined,
          endDate: undefined,
          durationType: "",
          halfDaySegment: "",
          bereavementRelationship: "",
          bereavementRelationshipOther: "",
          weddingCardImage: undefined,
          voterIdImage: undefined,
          examCourseName: "",
          examHallTicket: undefined,
          vipassanaDocuments: [],
        });
        setSelectedDurationType("");
        setValidationError(null);
        setDateRange(undefined);
        setOpen(false);
        onSuccess(submittedDate);
      }
    } catch (error: unknown) {
      const msg =
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          (error as { response?: { data?: { message?: string } } }).response?.data
            ?.message
          ? (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message
          : error instanceof Error
            ? error.message
            : "Failed to submit leave request.";
      toast.error("Submission failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  const priority = ["casual leave", "wellness leave"];
  const getDisplayLeaveTypeName = (name: string) => {
    return name.trim().toLowerCase() === "comp off"
      ? "Compensatory Leave"
      : name;
  };

  const sortedLeaveTypes = [...leaveTypes].sort((a, b) => {
    const aKey = getDisplayLeaveTypeName(a.name || "").toLowerCase();
    const bKey = getDisplayLeaveTypeName(b.name || "").toLowerCase();
    const ai = priority.findIndex((p) => aKey.includes(p));
    const bi = priority.findIndex((p) => bKey.includes(p));
    return (
      (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi) ||
      aKey.localeCompare(bKey)
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogDescription>
            Fill in the details below to submit your application
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-2"
          >
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="— Select leave type —" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedLeaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.code}>
                          {getDisplayLeaveTypeName(type.name)} — {formatLeaveDaysValue(type.balanceHours / 8)} remaining
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Bereavement Fields */}
            {isBereavement && (
              <div className="space-y-4  border-primary/20 py-1">
                <FormField
                  control={form.control}
                  name="bereavementRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Deepest condolences for your loss. Please describe your relationship to the deceased
                      </FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="other_immediate_family_member">
                            Other Immediate Family Member
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchBereavementRelationship === "other_immediate_family_member" && (
                  <FormField
                    control={form.control}
                    name="bereavementRelationshipOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Please mention your relationship with them</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Describe your relationship"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Conditional Wedding Fields */}
            {isWedding && (
              <div className="space-y-4 border-primary/20 py-1">
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertCircle className="h-4 w-4 !text-foreground" />
                  <AlertTitle className="text-foreground font-semibold">
                    Wedding Congratulations!
                  </AlertTitle>
                  <AlertDescription className="text-foreground">
                    Heartiest congratulations from NavGurukul! We wish you a lifetime of happiness and love! ❤️
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="weddingCardImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUploadField
                          label="Upload an image of your wedding card invitation"
                          accept="image/*"
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val);
                          }}
                          error={form.formState.errors.weddingCardImage?.message as string}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional Election Fields */}
            {isElection && (
              <div className="space-y-4  border-primary/20 py-1">
                <FormField
                  control={form.control}
                  name="voterIdImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUploadField
                          label="Upload your Voter ID card"
                          accept="image/*"
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val);
                          }}
                          error={form.formState.errors.voterIdImage?.message as string}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional Exam Fields */}
            {isExam && (
              <div className="space-y-4 border-primary/20 py-1">
                <FormField
                  control={form.control}
                  name="examCourseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course or Exam Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter course or exam name"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="examHallTicket"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUploadField
                          label="Upload your hall ticket or exam schedule image with the university’s letterhead"
                          accept="image/*,application/pdf"
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val);
                          }}
                          error={form.formState.errors.examHallTicket?.message as string}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional L&D Fields */}
            {isLAndD && (
              <div className="space-y-4 border-primary/20 py-1">
                <FormField
                  control={form.control}
                  name="examCourseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Learning program, course, workshop, or event name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter learning program, course, workshop, or event name"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional Vipassana Fields */}
            {(isVipassanaCourse || isVipassanaSeva) && (
              <div className="space-y-4 border-primary/20 py-1">
                <FormField
                  control={form.control}
                  name="vipassanaDocuments"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUploadField
                          label="Upload your booking confirmation and/or completion certificate"
                          accept="image/*,application/pdf"
                          multiple={true}
                          value={field.value}
                          onChange={(val) => {
                            field.onChange(val);
                          }}
                          error={form.formState.errors.vipassanaDocuments?.message as string}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="startDate"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>{isElection ? "Leave Date" : "Leave Date Range"}</FormLabel>
                  <Popover
                    modal
                    open={dateRangeOpen}
                    onOpenChange={setDateRangeOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          isElection ||
                          !dateRange.to ||
                          format(dateRange.from, DATE_FORMATS.DISPLAY) ===
                            format(dateRange.to, DATE_FORMATS.DISPLAY) ? (
                            format(dateRange.from, DATE_FORMATS.DISPLAY)
                          ) : (
                            <>
                              {format(dateRange.from, DATE_FORMATS.DISPLAY)}{" "}
                              – {format(dateRange.to, DATE_FORMATS.DISPLAY)}
                            </>
                          )
                        ) : (
                          <span>
                            {isElection ? "Pick a date" : "Pick a date range"}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 border-0"
                      align="start"
                      side="bottom"
                      sideOffset={8}
                      style={{ zIndex: 9999 }}
                    >
                      {isElection ? (
                        <Calendar
                          mode="single"
                          defaultMonth={dateRange?.from}
                          selected={dateRange?.from}
                          onSelect={handleSingleDateSelect}
                          disabled={disabledDates}
                          initialFocus
                        />
                      ) : (
                        <Calendar
                          mode="range"
                          defaultMonth={dateRange?.from}
                          selected={dateRange}
                          onSelect={(range) => {
                            setDateRange(range);
                            if (range?.from && range?.to) {
                              setDateRangeOpen(false);
                            }
                          }}
                          numberOfMonths={2}
                          disabled={disabledDates}
                          initialFocus
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {isElection
                      ? "Click to select the date of your election leave"
                      : "Click to select start date, then click end date for range"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedDurationType(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {durationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDurationType === "half_day" && (
              <FormField
                control={form.control}
                name="halfDaySegment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Half Day Segment</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select half day segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="first_half">First Half</SelectItem>
                        <SelectItem value="second_half">Second Half</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Half day will be applied for each day in the selected
                      range (excluding week offs and fixed holidays).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Error</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="noShadow"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isValidating || !!validationError}
              >
                {isSubmitting
                  ? "Submitting..."
                  : isValidating
                    ? "Validating..."
                    : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
