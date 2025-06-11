"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, FileText, Calculator, Clock, Save, Filter, Search, SlidersHorizontal, X, Check, CalendarRange, Award } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { SalaryConfig, SalaryCalculationResult, BonusEntry, getSalaryConfig, saveSalaryConfig, calculateAllSalaries } from "@/lib/salaryCalculator"
import { formatCurrency } from "@/lib/utils"
import { createSalaryReport, createEmployeeSalaryDetailReport } from "@/lib/pdfGenerator"
import { formatSalaryDataForExport, convertToCSV, downloadCSV } from "@/lib/utils"

interface EmployeeRegistration {
  id: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  status: "pending" | "approved" | "rejected" | "suspended"
  qrCode: string
  uniqueCode: string
  registeredAt: string
}

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  type: "check-in" | "check-out"
  timestamp: string
  location?: string
}

interface PaidLeaveEntry {
  employeeId: string
  hours: number
}

export default function SalaryPage() {
  const [employees, setEmployees] = useState<EmployeeRegistration[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(getSalaryConfig())
  const [dateRangeStart, setDateRangeStart] = useState<string>("")
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("")
  const [salaryResults, setSalaryResults] = useState<SalaryCalculationResult[]>([])
  const [paidLeaveEntries, setPaidLeaveEntries] = useState<Record<string, number>>({})
  const [bonusEntries, setBonusEntries] = useState<Record<string, BonusEntry>>({})
  const [selectedTab, setSelectedTab] = useState("config")
  const [searchTerm, setSearchTerm] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [minSalaryFilter, setMinSalaryFilter] = useState<string>("")
  const [maxSalaryFilter, setMaxSalaryFilter] = useState<string>("")
  const [minRegularHoursFilter, setMinRegularHoursFilter] = useState<string>("")
  const [minOvertimeHoursFilter, setMinOvertimeHoursFilter] = useState<string>("")
  const [minWeekendHoursFilter, setMinWeekendHoursFilter] = useState<string>("")
  const [minDailyHoursFilter, setMinDailyHoursFilter] = useState<string>("")
  const [maxDailyHoursFilter, setMaxDailyHoursFilter] = useState<string>("")
  const [minDaysWorkedFilter, setMinDaysWorkedFilter] = useState<string>("")
  const [timeRangeType, setTimeRangeType] = useState<"day" | "week" | "month" | "custom">("month")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [currentBonusAmount, setCurrentBonusAmount] = useState<string>("")
  const [currentBonusPercentage, setCurrentBonusPercentage] = useState<string>("")
  const [currentBonusReason, setCurrentBonusReason] = useState<string>("")
  
  // States for batch bonus feature
  const [showBatchBonusModal, setShowBatchBonusModal] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [batchBonusAmount, setBatchBonusAmount] = useState<string>("")
  const [batchBonusPercentage, setBatchBonusPercentage] = useState<string>("")
  const [batchBonusReason, setBatchBonusReason] = useState<string>("")
  const [selectAll, setSelectAll] = useState(false)
  
  const router = useRouter()

  // Danh sách phòng ban
  const departmentsList = useMemo(() => {
    const departments = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) {
        departments.add(emp.department);
      }
    });
    return Array.from(departments);
  }, [employees]);

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin")
    if (!isAdmin) {
      router.push("/admin/login")
      return
    }

    // Set default date range to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setDateRangeStart(firstDay.toISOString().split("T")[0]);
    setDateRangeEnd(lastDay.toISOString().split("T")[0]);
    
    loadData()
  }, [router])

  const loadData = () => {
    const empRegistrations = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    const records = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")

    setEmployees(empRegistrations)
    setAttendanceRecords(records)
  }

  // Save salary configuration
  const saveConfig = () => {
    saveSalaryConfig(salaryConfig);
    alert("Cấu hình lương đã được lưu");
  }

  // Handle config changes
  const handleConfigChange = (field: keyof SalaryConfig, value: number) => {
    setSalaryConfig({
      ...salaryConfig,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  }

  // Handle paid leave entries
  const handlePaidLeaveChange = (employeeId: string, hours: number) => {
    setPaidLeaveEntries(prev => ({
      ...prev,
      [employeeId]: hours
    }));
  }

  // Calculate salaries based on current configuration
  const calculateSalaries = () => {
    if (!dateRangeStart || !dateRangeEnd) {
      alert("Vui lòng chọn khoảng thời gian tính lương");
      return;
    }
    
    const results = calculateAllSalaries(
      employees,
      attendanceRecords,
      salaryConfig,
      dateRangeStart,
      dateRangeEnd,
      paidLeaveEntries,
      bonusEntries
    );
    
    setSalaryResults(results);
    setSelectedTab("results");
  }
  
  // Handle time range selection
  const handleTimeRangeChange = (type: "day" | "week" | "month" | "custom") => {
    setTimeRangeType(type);
    
    const today = new Date();
    let startDate: Date;
    let endDate: Date = new Date(today);
    
    switch (type) {
      case "day":
        startDate = new Date(today);
        break;
      case "week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        break;
      case "month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // End of month
        break;
      case "custom":
        // Keep current dates
        return;
    }
    
    setDateRangeStart(startDate.toISOString().split("T")[0]);
    setDateRangeEnd(endDate.toISOString().split("T")[0]);
  };
  
  // Handle bonus entry
  const handleBonusEntry = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    
    // Load existing bonus if any
    const existingBonus = bonusEntries[employeeId];
    if (existingBonus) {
      setCurrentBonusAmount(existingBonus.amount.toString());
      setCurrentBonusPercentage(existingBonus.percentage.toString());
      setCurrentBonusReason(existingBonus.reason || "");
    } else {
      setCurrentBonusAmount("");
      setCurrentBonusPercentage("");
      setCurrentBonusReason("");
    }
    
    setShowBonusModal(true);
  };
  
  // Save bonus entry
  const saveBonus = () => {
    if (!selectedEmployee) return;
    
    const amount = currentBonusAmount ? parseFloat(currentBonusAmount) : 0;
    const percentage = currentBonusPercentage ? parseFloat(currentBonusPercentage) : 0;
    
    if (amount === 0 && percentage === 0) {
      // If both zero, remove any bonus
      const newBonuses = { ...bonusEntries };
      delete newBonuses[selectedEmployee];
      setBonusEntries(newBonuses);
    } else {
      setBonusEntries({
        ...bonusEntries,
        [selectedEmployee]: {
          employeeId: selectedEmployee,
          amount,
          percentage,
          reason: currentBonusReason
        }
      });
    }
    
    setShowBonusModal(false);
    
    // Automatically recalculate salaries with the new bonus data
    const updatedBonuses = amount === 0 && percentage === 0 
      ? { ...bonusEntries }  // Create a copy for delete operation
      : { 
          ...bonusEntries, 
          [selectedEmployee]: { employeeId: selectedEmployee, amount, percentage, reason: currentBonusReason } 
        };
        
    if (amount === 0 && percentage === 0) {
      delete updatedBonuses[selectedEmployee];
    }
    
    // Recalculate salaries
    const results = calculateAllSalaries(
      employees,
      attendanceRecords,
      salaryConfig,
      dateRangeStart,
      dateRangeEnd,
      paidLeaveEntries,
      updatedBonuses
    );
    
    setSalaryResults(results);
  };

  // Toggle department selection
  const toggleDepartment = (department: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(department)) {
        return prev.filter(d => d !== department);
      } else {
        return [...prev, department];
      }
    });
  }

  // Apply advanced filters
  const applyFilters = () => {
    const activeFiltersList: string[] = [];
    
    if (selectedDepartments.length > 0) {
      activeFiltersList.push(`Phòng ban (${selectedDepartments.length})`);
    }
    
    if (minSalaryFilter) {
      activeFiltersList.push(`Lương > ${formatCurrency(Number(minSalaryFilter))}`);
    }
    
    if (maxSalaryFilter) {
      activeFiltersList.push(`Lương < ${formatCurrency(Number(maxSalaryFilter))}`);
    }
    
    if (minRegularHoursFilter) {
      activeFiltersList.push(`Giờ thường > ${minRegularHoursFilter}h`);
    }
    
    if (minOvertimeHoursFilter) {
      activeFiltersList.push(`Giờ tăng ca > ${minOvertimeHoursFilter}h`);
    }
    
    if (minWeekendHoursFilter) {
      activeFiltersList.push(`Giờ cuối tuần > ${minWeekendHoursFilter}h`);
    }
    
    if (minDailyHoursFilter) {
      activeFiltersList.push(`Giờ/ngày > ${minDailyHoursFilter}h`);
    }
    
    if (maxDailyHoursFilter) {
      activeFiltersList.push(`Giờ/ngày < ${maxDailyHoursFilter}h`);
    }
    
    if (minDaysWorkedFilter) {
      activeFiltersList.push(`Ngày làm > ${minDaysWorkedFilter}`);
    }
    
    setActiveFilters(activeFiltersList);
    setShowAdvancedFilters(false);
  }
  
  // Calculate total salary amount
  const calculateTotalSalary = (results: SalaryCalculationResult[]) => {
    return results.reduce((sum, result) => sum + result.totalAmount, 0);
  }

  // Filter and sort salary results
  const filteredResults = useMemo(() => {
    return salaryResults
      .filter(result => {
        // Text search
        const matchesSearch = 
          searchTerm === "" || 
          result.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) || 
          result.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Department filter
        const matchesDepartment = 
          selectedDepartments.length === 0 || 
          selectedDepartments.includes(employees.find(emp => emp.id === result.employeeId)?.department || "");
        
        // Salary range filter
        const matchesMinSalary = 
          minSalaryFilter === "" || 
          result.totalAmount >= parseFloat(minSalaryFilter);
        
        const matchesMaxSalary = 
          maxSalaryFilter === "" || 
          result.totalAmount <= parseFloat(maxSalaryFilter);
        
        // Hours filters
        const matchesMinRegularHours =
          minRegularHoursFilter === "" ||
          result.regularHours >= parseFloat(minRegularHoursFilter);
          
        const matchesMinOvertimeHours =
          minOvertimeHoursFilter === "" ||
          result.overtimeHours >= parseFloat(minOvertimeHoursFilter);
          
        const matchesMinWeekendHours =
          minWeekendHoursFilter === "" ||
          result.weekendHours >= parseFloat(minWeekendHoursFilter);
          
        // Daily hours filters
        const matchesMinDailyHours =
          minDailyHoursFilter === "" ||
          result.avgDailyHours >= parseFloat(minDailyHoursFilter);
          
        const matchesMaxDailyHours =
          maxDailyHoursFilter === "" ||
          result.avgDailyHours <= parseFloat(maxDailyHoursFilter);
        
        // Days worked filter
        const matchesMinDaysWorked = 
          minDaysWorkedFilter === "" ||
          result.daysWorked >= parseFloat(minDaysWorkedFilter);
        
        return matchesSearch && 
               matchesDepartment && 
               matchesMinSalary && 
               matchesMaxSalary &&
               matchesMinRegularHours &&
               matchesMinOvertimeHours &&
               matchesMinWeekendHours &&
               matchesMinDailyHours &&
               matchesMaxDailyHours &&
               matchesMinDaysWorked;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return sortOrder === "asc" 
            ? a.employeeName.localeCompare(b.employeeName)
            : b.employeeName.localeCompare(a.employeeName);
        } else if (sortBy === "id") {
          return sortOrder === "asc"
            ? a.employeeId.localeCompare(b.employeeId)
            : b.employeeId.localeCompare(a.employeeId);
        } else if (sortBy === "salary") {
          return sortOrder === "asc"
            ? a.totalAmount - b.totalAmount
            : b.totalAmount - a.totalAmount;
        } else if (sortBy === "daysWorked") {
          return sortOrder === "asc"
            ? a.daysWorked - b.daysWorked
            : b.daysWorked - a.daysWorked;
        } else if (sortBy === "avgDailyHours") {
          return sortOrder === "asc"
            ? a.avgDailyHours - b.avgDailyHours
            : b.avgDailyHours - a.avgDailyHours;
        }
        return 0;
      });
  }, [
    salaryResults, 
    searchTerm, 
    selectedDepartments, 
    minSalaryFilter, 
    maxSalaryFilter, 
    minRegularHoursFilter,
    minOvertimeHoursFilter,
    minWeekendHoursFilter,
    minDailyHoursFilter,
    maxDailyHoursFilter,
    minDaysWorkedFilter,
    sortBy, 
    sortOrder,
    employees
  ]);
  
  // Calculate total salary for filtered results
  const totalSalary = useMemo(() => calculateTotalSalary(filteredResults), [filteredResults]);
  
  // Generate PDF report with all salary data
  const exportAllPDF = () => {
    createSalaryReport(
      filteredResults,
      salaryConfig,
      dateRangeStart,
      dateRangeEnd,
      employees.filter(e => e.status === "approved").length,
      selectedDepartments
    );
  }
  
  // Generate PDF for one employee
  const exportIndividualPDF = (result: SalaryCalculationResult) => {
    createEmployeeSalaryDetailReport(result);
  }
  
  // Export data to Excel
  const exportExcel = () => {
    if (filteredResults.length === 0) {
      alert("Không có dữ liệu lương để xuất báo cáo");
      return;
    }
    
    const formattedData = formatSalaryDataForExport(filteredResults, bonusEntries);
    const csvContent = convertToCSV(formattedData);
    downloadCSV(csvContent, `salary-report-${dateRangeStart}-${dateRangeEnd}.csv`);
  }
  
  // Xuất báo cáo dạng PDF
  const exportPDF = () => {
    exportAllPDF();
  }
  
  // Xuất báo cáo chi tiết nhân viên
  const exportEmployeeDetail = (result: SalaryCalculationResult) => {
    exportIndividualPDF(result);
  }

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDepartments([]);
    setMinSalaryFilter("");
    setMaxSalaryFilter("");
    setMinRegularHoursFilter("");
    setMinOvertimeHoursFilter("");
    setMinWeekendHoursFilter("");
    setMinDailyHoursFilter("");
    setMaxDailyHoursFilter("");
    setMinDaysWorkedFilter("");
    setTimeRangeType("month");
    setSortBy("name");
    setSortOrder("asc");
    setActiveFilters([]);
  }

  // Navigate back to admin page
  const goBack = () => {
    router.push("/admin")
  }

  // Toggle employee selection for batch bonus
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Toggle select all employees
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      // Select all employees in filtered results
      setSelectedEmployees(filteredResults.map(result => result.employeeId));
    } else {
      // Deselect all
      setSelectedEmployees([]);
    }
  };
  
  // Open batch bonus modal
  const openBatchBonusModal = () => {
    if (selectedEmployees.length === 0) {
      alert("Vui lòng chọn ít nhất một nhân viên");
      return;
    }
    
    setBatchBonusAmount("");
    setBatchBonusPercentage("");
    setBatchBonusReason("");
    setShowBatchBonusModal(true);
  };
  
  // Apply bonus to all selected employees
  const applyBatchBonus = () => {
    const amount = batchBonusAmount ? parseFloat(batchBonusAmount) : 0;
    const percentage = batchBonusPercentage ? parseFloat(batchBonusPercentage) : 0;
    
    if (amount === 0 && percentage === 0) {
      alert("Vui lòng nhập số tiền thưởng hoặc phần trăm thưởng");
      return;
    }
    
    // Create updated bonuses object
    const updatedBonuses = { ...bonusEntries };
    
    // Apply to all selected employees
    selectedEmployees.forEach(employeeId => {
      updatedBonuses[employeeId] = {
        employeeId,
        amount,
        percentage,
        reason: batchBonusReason
      };
    });
    
    // Update state
    setBonusEntries(updatedBonuses);
    setShowBatchBonusModal(false);
    
    // Recalculate salaries with new bonus data
    const results = calculateAllSalaries(
      employees,
      attendanceRecords,
      salaryConfig,
      dateRangeStart,
      dateRangeEnd,
      paidLeaveEntries,
      updatedBonuses
    );
    
    setSalaryResults(results);
    
    // Clear selections after applying
    setSelectedEmployees([]);
    setSelectAll(false);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Button onClick={goBack} size="icon" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Quản lý lương</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm nhanh theo mã, tên nhân viên..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Lọc nâng cao
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h3 className="font-medium">Bộ lọc nâng cao</h3>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Khoảng thời gian</Label>
                  <RadioGroup value={timeRangeType} onValueChange={(v) => handleTimeRangeChange(v as any)}>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="day" id="day" />
                        <Label htmlFor="day" className="text-sm">Ngày</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="week" id="week" />
                        <Label htmlFor="week" className="text-sm">Tuần</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="month" id="month" />
                        <Label htmlFor="month" className="text-sm">Tháng</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="text-sm">Tùy chọn</Label>
                      </div>
                    </div>
                  </RadioGroup>
                  
                  {timeRangeType === "custom" && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="space-y-1">
                        <Label htmlFor="dateStart" className="text-xs">Từ ngày</Label>
                        <Input
                          id="dateStart"
                          type="date"
                          value={dateRangeStart}
                          onChange={(e) => setDateRangeStart(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="dateEnd" className="text-xs">Đến ngày</Label>
                        <Input
                          id="dateEnd"
                          type="date"
                          value={dateRangeEnd}
                          onChange={(e) => setDateRangeEnd(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phòng ban</Label>
                  <div className="border rounded-md p-2 space-y-1 max-h-28 overflow-y-auto">
                    {departmentsList.map((dept: string) => (
                      <div key={dept} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`dept-${dept}`} 
                          checked={selectedDepartments.includes(dept)}
                          onCheckedChange={() => toggleDepartment(dept)}
                        />
                        <Label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer">
                          {dept}
                        </Label>
                      </div>
                    ))}
                    {departmentsList.length === 0 && (
                      <div className="text-sm text-muted-foreground">Không có phòng ban</div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="minSalary" className="text-xs">Lương tối thiểu</Label>
                    <Input
                      id="minSalary"
                      type="number"
                      placeholder="VND"
                      value={minSalaryFilter}
                      onChange={(e) => setMinSalaryFilter(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="maxSalary" className="text-xs">Lương tối đa</Label>
                    <Input
                      id="maxSalary"
                      type="number"
                      placeholder="VND"
                      value={maxSalaryFilter}
                      onChange={(e) => setMaxSalaryFilter(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Số giờ làm hàng ngày</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="minDailyHours" className="text-xs">Tối thiểu</Label>
                      <Input
                        id="minDailyHours"
                        type="number"
                        placeholder="Giờ"
                        value={minDailyHoursFilter}
                        onChange={(e) => setMinDailyHoursFilter(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxDailyHours" className="text-xs">Tối đa</Label>
                      <Input
                        id="maxDailyHours"
                        type="number"
                        placeholder="Giờ"
                        value={maxDailyHoursFilter}
                        onChange={(e) => setMaxDailyHoursFilter(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="minDaysWorked" className="text-xs">Số ngày làm tối thiểu</Label>
                  <Input
                    id="minDaysWorked"
                    type="number"
                    placeholder="Ngày"
                    value={minDaysWorkedFilter}
                    onChange={(e) => setMinDaysWorkedFilter(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Số giờ tối thiểu theo loại</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="minRegularHours" className="text-xs">Giờ thường</Label>
                      <Input
                        id="minRegularHours"
                        type="number"
                        placeholder="Giờ"
                        value={minRegularHoursFilter}
                        onChange={(e) => setMinRegularHoursFilter(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="minOvertimeHours" className="text-xs">Tăng ca</Label>
                      <Input
                        id="minOvertimeHours"
                        type="number"
                        placeholder="Giờ"
                        value={minOvertimeHoursFilter}
                        onChange={(e) => setMinOvertimeHoursFilter(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="minWeekendHours" className="text-xs">Cuối tuần</Label>
                      <Input
                        id="minWeekendHours"
                        type="number"
                        placeholder="Giờ"
                        value={minWeekendHoursFilter}
                        onChange={(e) => setMinWeekendHoursFilter(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sortBy" className="text-xs">Sắp xếp theo</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sortBy" className="h-8 text-sm">
                        <SelectValue placeholder="Sắp xếp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Tên nhân viên</SelectItem>
                        <SelectItem value="id">Mã nhân viên</SelectItem>
                        <SelectItem value="salary">Tổng lương</SelectItem>
                        <SelectItem value="daysWorked">Số ngày làm</SelectItem>
                        <SelectItem value="avgDailyHours">Giờ trung bình/ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="sortOrder" className="text-xs">Thứ tự</Label>
                    <Select value={sortOrder} onValueChange={(value: string) => setSortOrder(value as "asc" | "desc")}>
                      <SelectTrigger id="sortOrder" className="h-8 text-sm">
                        <SelectValue placeholder="Thứ tự" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Tăng dần</SelectItem>
                        <SelectItem value="desc">Giảm dần</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-between pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    <X className="w-3 h-3 mr-1" />
                    Xóa bộ lọc
                  </Button>
                  <Button size="sm" onClick={applyFilters}>
                    <Check className="w-3 h-3 mr-1" />
                    Áp dụng
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2 text-xs">
              <X className="w-3 h-3 mr-1" />
              Xóa tất cả bộ lọc
            </Button>
          )}
        </div>
      </div>
      
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary">
              {filter}
            </Badge>
          ))}
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="config">Cấu hình lương</TabsTrigger>
          <TabsTrigger value="calculate">Tính lương</TabsTrigger>
          <TabsTrigger value="results">Kết quả lương</TabsTrigger>
        </TabsList>

        {/* Cấu hình lương */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình tính lương</CardTitle>
              <CardDescription>
                Thiết lập các thông số tính lương cho nhân viên
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Mức lương giờ (VND)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={salaryConfig.hourlyRate}
                    onChange={(e) => handleConfigChange("hourlyRate", Number(e.target.value))}
                  />
                  <p className="text-sm text-gray-500">
                    Mức lương cơ bản cho mỗi giờ làm việc
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minuteRate">Mức lương phút (VND)</Label>
                  <Input
                    id="minuteRate"
                    type="number"
                    value={salaryConfig.minuteRate}
                    onChange={(e) => handleConfigChange("minuteRate", Number(e.target.value))}
                  />
                  <p className="text-sm text-gray-500">
                    Mức lương cho mỗi phút làm việc (thường = hourlyRate/60)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtimeMultiplier">Hệ số tăng ca</Label>
                  <Input
                    id="overtimeMultiplier"
                    type="number"
                    step="0.1"
                    value={salaryConfig.overtimeMultiplier}
                    onChange={(e) => handleConfigChange("overtimeMultiplier", Number(e.target.value))}
                  />
                  <p className="text-sm text-gray-500">
                    Hệ số nhân cho giờ tăng ca (VD: 1.5 = 150% lương cơ bản)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekendMultiplier">Hệ số làm cuối tuần</Label>
                  <Input
                    id="weekendMultiplier"
                    type="number"
                    step="0.1"
                    value={salaryConfig.weekendMultiplier}
                    onChange={(e) => handleConfigChange("weekendMultiplier", Number(e.target.value))}
                  />
                  <p className="text-sm text-gray-500">
                    Hệ số nhân cho giờ làm cuối tuần (VD: 2.0 = 200% lương cơ bản)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidLeaveRate">Hệ số nghỉ có lương</Label>
                  <Input
                    id="paidLeaveRate"
                    type="number"
                    step="0.1"
                    value={salaryConfig.paidLeaveRate}
                    onChange={(e) => handleConfigChange("paidLeaveRate", Number(e.target.value))}
                  />
                  <p className="text-sm text-gray-500">
                    Hệ số nhân cho giờ nghỉ có lương (VD: 0.5 = 50% lương cơ bản)
                  </p>
                </div>
              </div>
              <Button onClick={saveConfig} className="mt-4">
                <Save className="w-4 h-4 mr-2" />
                Lưu cấu hình
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tính lương */}
        <TabsContent value="calculate">
          <Card>
            <CardHeader>
              <CardTitle>Tính lương</CardTitle>
              <CardDescription>
                Chọn khoảng thời gian và nhập số giờ nghỉ phép có lương
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateStart">Từ ngày</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateEnd">Đến ngày</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Nhập số giờ nghỉ phép có lương</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm nhân viên theo mã, tên hoặc phòng ban..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã nhân viên</TableHead>
                        <TableHead>Tên nhân viên</TableHead>
                        <TableHead>Phòng ban</TableHead>
                        <TableHead>Số giờ phép</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees
                        .filter(emp => emp.status === "approved")
                        .filter(emp => 
                          searchTerm === "" || 
                          emp.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.department.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell>{employee.id}</TableCell>
                            <TableCell>{employee.name}</TableCell>
                            <TableCell>{employee.department}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={paidLeaveEntries[employee.id] || 0}
                                onChange={(e) => 
                                  handlePaidLeaveChange(employee.id, Number(e.target.value))
                                }
                                min="0"
                                step="1"
                                className="w-24"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <Button onClick={calculateSalaries} className="mt-6">
                <Calculator className="w-4 h-4 mr-2" />
                Tính lương
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kết quả lương */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Kết quả tính lương</CardTitle>
              <CardDescription>
                Từ {dateRangeStart ? new Date(dateRangeStart).toLocaleDateString('vi-VN') : ''} 
                đến {dateRangeEnd ? new Date(dateRangeEnd).toLocaleDateString('vi-VN') : ''}
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button variant="outline" onClick={exportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Xuất PDF
                </Button>
                <Button variant="outline" onClick={exportExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Xuất Excel
                </Button>
                {selectedEmployees.length > 0 && (
                  <Button variant="default" onClick={openBatchBonusModal}>
                    <Award className="w-4 h-4 mr-2" />
                    Thưởng {selectedEmployees.length} nhân viên đã chọn
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {salaryResults.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Chọn tất cả nhân viên"
                          />
                        </TableHead>
                        <TableHead className="w-[100px]">Mã NV</TableHead>
                        <TableHead>Tên nhân viên</TableHead>
                        <TableHead>Giờ thường</TableHead>
                        <TableHead>Giờ tăng ca</TableHead>
                        <TableHead>Giờ cuối tuần</TableHead>
                        <TableHead>Nghỉ có lương</TableHead>
                        <TableHead>Số ngày làm</TableHead>
                        <TableHead>Giờ TB/ngày</TableHead>
                        <TableHead className="text-right">Lương cơ bản</TableHead>
                        <TableHead className="text-right">Thưởng</TableHead>
                        <TableHead className="text-right">Tổng cộng</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result) => (
                        <TableRow key={result.employeeId} className={selectedEmployees.includes(result.employeeId) ? "bg-muted/30" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedEmployees.includes(result.employeeId)}
                              onCheckedChange={() => toggleEmployeeSelection(result.employeeId)}
                              aria-label={`Chọn ${result.employeeName}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{result.employeeId}</TableCell>
                          <TableCell>{result.employeeName}</TableCell>
                          <TableCell>
                            {result.regularHours}h {result.regularMinutes}p
                          </TableCell>
                          <TableCell>
                            {result.overtimeHours}h {result.overtimeMinutes}p
                          </TableCell>
                          <TableCell>
                            {result.weekendHours}h {result.weekendMinutes}p
                          </TableCell>
                          <TableCell>
                            {result.paidLeaveHours}h
                          </TableCell>
                          <TableCell>
                            {result.daysWorked}
                          </TableCell>
                          <TableCell>
                            {result.avgDailyHours.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              result.regularAmount + 
                              result.overtimeAmount + 
                              result.weekendAmount + 
                              result.paidLeaveAmount
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {result.bonusAmount > 0 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-green-600 dark:text-green-400 cursor-help">
                                      +{formatCurrency(result.bonusAmount)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white dark:bg-gray-900 border text-xs">
                                    {result.bonusPercentage > 0 && (
                                      <div>Thưởng {result.bonusPercentage}%</div>
                                    )}
                                    {bonusEntries[result.employeeId]?.reason && (
                                      <div>Lý do: {bonusEntries[result.employeeId].reason}</div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(result.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleBonusEntry(result.employeeId)}
                              >
                                <Award className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => exportEmployeeDetail(result)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredResults.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                            Không có kết quả phù hợp
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={8} className="text-left font-medium">
                          Tổng cộng ({filteredResults.length} nhân viên)
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            filteredResults.reduce(
                              (acc, result) => acc + result.regularAmount + 
                                result.overtimeAmount + 
                                result.weekendAmount + 
                                result.paidLeaveAmount, 
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            filteredResults.reduce(
                              (acc, result) => acc + result.bonusAmount, 
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            filteredResults.reduce(
                              (acc, result) => acc + result.totalAmount, 
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p>Chưa có dữ liệu lương. Vui lòng tính lương trước.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bonus Modal */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Thưởng cho nhân viên</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowBonusModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="bonusAmount" className="text-sm">Số tiền thưởng (VND)</Label>
                <Input
                  id="bonusAmount"
                  type="number"
                  placeholder="0"
                  value={currentBonusAmount}
                  onChange={(e) => setCurrentBonusAmount(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="bonusPercentage" className="text-sm">Phần trăm thưởng (%)</Label>
                <Input
                  id="bonusPercentage"
                  type="number"
                  placeholder="0"
                  value={currentBonusPercentage}
                  onChange={(e) => setCurrentBonusPercentage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  % được tính trên tổng lương (không bao gồm phần thưởng)
                </p>
              </div>
              
              <div>
                <Label htmlFor="bonusReason" className="text-sm">Lý do thưởng (tùy chọn)</Label>
                <Input
                  id="bonusReason"
                  placeholder="Lý do thưởng"
                  value={currentBonusReason}
                  onChange={(e) => setCurrentBonusReason(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setShowBonusModal(false)}>
                  Hủy
                </Button>
                <Button onClick={saveBonus}>
                  <Check className="h-4 w-4 mr-1" /> Lưu thưởng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Bonus Modal */}
      {showBatchBonusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Thưởng cho {selectedEmployees.length} nhân viên</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowBatchBonusModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="batchBonusAmount" className="text-sm">Số tiền thưởng (VND)</Label>
                <Input
                  id="batchBonusAmount"
                  type="number"
                  placeholder="0"
                  value={batchBonusAmount}
                  onChange={(e) => setBatchBonusAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mỗi nhân viên được chọn sẽ nhận được số tiền thưởng này.
                </p>
              </div>
              
              <div>
                <Label htmlFor="batchBonusPercentage" className="text-sm">Phần trăm thưởng (%)</Label>
                <Input
                  id="batchBonusPercentage"
                  type="number"
                  placeholder="0"
                  value={batchBonusPercentage}
                  onChange={(e) => setBatchBonusPercentage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  % được tính trên tổng lương (không bao gồm phần thưởng) cho mỗi nhân viên.
                </p>
              </div>
              
              <div>
                <Label htmlFor="batchBonusReason" className="text-sm">Lý do thưởng (tùy chọn)</Label>
                <Input
                  id="batchBonusReason"
                  placeholder="Lý do thưởng"
                  value={batchBonusReason}
                  onChange={(e) => setBatchBonusReason(e.target.value)}
                />
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Nhân viên được chọn: {selectedEmployees.length}</p>
                <div className="text-xs text-muted-foreground max-h-24 overflow-y-auto border rounded p-2">
                  {filteredResults
                    .filter(result => selectedEmployees.includes(result.employeeId))
                    .map(result => (
                      <div key={result.employeeId} className="mb-1">
                        {result.employeeId} - {result.employeeName}
                      </div>
                    ))
                  }
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setShowBatchBonusModal(false)}>
                  Hủy
                </Button>
                <Button onClick={applyBatchBonus}>
                  <Check className="h-4 w-4 mr-1" /> Áp dụng thưởng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 