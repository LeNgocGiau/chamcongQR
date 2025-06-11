// Salary calculation utilities

// Define salary configuration interface
export interface SalaryConfig {
  id: string;
  hourlyRate: number;
  minuteRate: number;
  overtimeMultiplier: number; // e.g. 1.5 means 150% of regular rate
  weekendMultiplier: number;  // e.g. 2.0 means 200% of regular rate
  paidLeaveRate: number;      // e.g. 0.5 means 50% of regular rate
  createdAt: string;
  updatedAt: string;
}

// Define salary calculation result interface
export interface SalaryCalculationResult {
  employeeId: string;
  employeeName: string;
  regularHours: number;
  regularMinutes: number;
  overtimeHours: number;
  overtimeMinutes: number;
  weekendHours: number;
  weekendMinutes: number;
  paidLeaveHours: number;
  paidLeaveMinutes: number;
  regularAmount: number;
  overtimeAmount: number;
  weekendAmount: number;
  paidLeaveAmount: number;
  bonusAmount: number;
  bonusPercentage: number;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  daysWorked: number;
  avgDailyHours: number;
}

// Define bonus entry
export interface BonusEntry {
  employeeId: string;
  amount: number;
  percentage: number;
  reason?: string;
}

// Get default salary config
export const getDefaultSalaryConfig = (): SalaryConfig => {
  return {
    id: "default",
    hourlyRate: 50000, // Default hourly rate in VND
    minuteRate: 833,   // Default per minute rate (50000/60)
    overtimeMultiplier: 1.5,
    weekendMultiplier: 2.0,
    paidLeaveRate: 0.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Load salary config from localStorage
export const getSalaryConfig = (): SalaryConfig => {
  if (typeof window !== "undefined") {
    const config = localStorage.getItem("salaryConfig");
    if (config) {
      return JSON.parse(config);
    }
  }
  return getDefaultSalaryConfig();
};

// Save salary config to localStorage
export const saveSalaryConfig = (config: SalaryConfig): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("salaryConfig", JSON.stringify({
      ...config,
      updatedAt: new Date().toISOString()
    }));
  }
};

// Check if date is a weekend (Saturday or Sunday)
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

// Calculate minutes for salary calculation (rounding up seconds as requested)
export const calculateRoundedMinutes = (hours: number, minutes: number, seconds: number): number => {
  return (hours * 60) + minutes + (seconds > 0 ? 1 : 0);
};

// Calculate salary based on attendance records and configuration
export const calculateSalary = (
  employeeId: string,
  employeeName: string,
  attendanceRecords: any[], // Use existing AttendanceRecord interface
  salaryConfig: SalaryConfig,
  startDate: string,
  endDate: string,
  paidLeaveHours: number = 0,
  bonusEntry?: BonusEntry
): SalaryCalculationResult => {
  // Initialize counters
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let weekendMinutes = 0;
  let daysWorked = 0;
  let totalWorkMinutes = 0;
  
  // Process records for the employee within date range
  const employeeRecords = attendanceRecords.filter(record => 
    record.employeeId === employeeId &&
    new Date(record.timestamp) >= new Date(startDate) && 
    new Date(record.timestamp) <= new Date(endDate + "T23:59:59")
  );
  
  // Group by date
  const recordsByDate: Record<string, any[]> = {};
  
  employeeRecords.forEach(record => {
    const date = new Date(record.timestamp).toISOString().split('T')[0];
    if (!recordsByDate[date]) {
      recordsByDate[date] = [];
    }
    recordsByDate[date].push(record);
  });
  
  // Calculate working time for each day
  Object.entries(recordsByDate).forEach(([date, records]) => {
    const isWeekendDay = isWeekend(new Date(date));
    const checkIns = records
      .filter(r => r.type === "check-in")
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const checkOuts = records
      .filter(r => r.type === "check-out")
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Calculate working minutes for each check-in/check-out pair
    let dailyMinutes = 0;
    for (let i = 0; i < Math.min(checkIns.length, checkOuts.length); i++) {
      const checkInTime = new Date(checkIns[i].timestamp);
      const checkOutTime = new Date(checkOuts[i].timestamp);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      // Round up seconds as per requirement
      const roundedMinutes = calculateRoundedMinutes(hours, minutes, seconds);
      dailyMinutes += roundedMinutes;
    }
    
    // If there were any check-ins and check-outs, count as a day worked
    if (checkIns.length > 0 && checkOuts.length > 0) {
      daysWorked++;
      totalWorkMinutes += dailyMinutes;
    }
    
    // Determine if this is overtime (over 8 hours per day = 480 minutes)
    const standardDailyMinutes = 480;
    let dailyRegularMinutes = Math.min(dailyMinutes, standardDailyMinutes);
    let dailyOvertimeMinutes = Math.max(0, dailyMinutes - standardDailyMinutes);
    
    // Assign minutes to proper category
    if (isWeekendDay) {
      weekendMinutes += dailyMinutes; // All weekend minutes count as weekend rate
    } else {
      regularMinutes += dailyRegularMinutes;
      overtimeMinutes += dailyOvertimeMinutes;
    }
  });
  
  // Add paid leave minutes
  const paidLeaveMinutes = paidLeaveHours * 60;
  
  // Calculate amounts
  const regularAmount = regularMinutes * salaryConfig.minuteRate;
  const overtimeAmount = overtimeMinutes * salaryConfig.minuteRate * salaryConfig.overtimeMultiplier;
  const weekendAmount = weekendMinutes * salaryConfig.minuteRate * salaryConfig.weekendMultiplier;
  const paidLeaveAmount = paidLeaveMinutes * salaryConfig.minuteRate * salaryConfig.paidLeaveRate;
  
  // Calculate bonus amount
  const bonusAmount = bonusEntry?.amount || 0;
  const bonusPercentage = bonusEntry?.percentage || 0;
  const calculatedBonusAmount = bonusAmount + 
    (bonusPercentage > 0 ? (regularAmount + overtimeAmount + weekendAmount + paidLeaveAmount) * (bonusPercentage / 100) : 0);
  
  const totalAmount = regularAmount + overtimeAmount + weekendAmount + paidLeaveAmount + calculatedBonusAmount;
  
  // Calculate average daily hours
  const avgDailyHours = daysWorked > 0 ? totalWorkMinutes / daysWorked / 60 : 0;
  
  return {
    employeeId,
    employeeName,
    regularHours: Math.floor(regularMinutes / 60),
    regularMinutes: regularMinutes % 60,
    overtimeHours: Math.floor(overtimeMinutes / 60),
    overtimeMinutes: overtimeMinutes % 60,
    weekendHours: Math.floor(weekendMinutes / 60),
    weekendMinutes: weekendMinutes % 60,
    paidLeaveHours,
    paidLeaveMinutes: 0, // No partial paid leave minutes
    regularAmount,
    overtimeAmount,
    weekendAmount,
    paidLeaveAmount,
    bonusAmount: calculatedBonusAmount,
    bonusPercentage,
    totalAmount,
    periodStart: startDate,
    periodEnd: endDate,
    daysWorked,
    avgDailyHours
  };
};

// Calculate salaries for all employees
export const calculateAllSalaries = (
  employees: any[],
  attendanceRecords: any[],
  salaryConfig: SalaryConfig,
  startDate: string,
  endDate: string,
  paidLeaveData: Record<string, number> = {},
  bonusData: Record<string, BonusEntry> = {}
): SalaryCalculationResult[] => {
  return employees
    .filter(emp => emp.status === "approved") // Only calculate for approved employees
    .map(employee => {
      return calculateSalary(
        employee.id,
        employee.name,
        attendanceRecords,
        salaryConfig,
        startDate,
        endDate,
        paidLeaveData[employee.id] || 0,
        bonusData[employee.id]
      );
    });
}; 