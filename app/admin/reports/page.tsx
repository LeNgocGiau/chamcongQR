"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, FileText, BarChart3, PieChartIcon, TrendingUp, Clock, RotateCcw, Trash, Filter, Search } from "lucide-react"
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


interface EmployeeRegistration {
  id: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  status: "pending" | "approved" | "rejected"
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

export default function ReportsPage() {
  const [employees, setEmployees] = useState<EmployeeRegistration[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [selectedRecords, setSelectedRecords] = useState<Record<string, boolean>>({})
  const [selectAllRecords, setSelectAllRecords] = useState(false)
  const [deletedRecords, setDeletedRecords] = useState<AttendanceRecord[]>([])
  const [showUndoAlert, setShowUndoAlert] = useState(false)
  
  // Advanced search filters
  const [searchTerm, setSearchTerm] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [minHoursPerDay, setMinHoursPerDay] = useState<string>("")
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<string>("")
  const [minHoursPerWeek, setMinHoursPerWeek] = useState<string>("")
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState<string>("")
  const [minHoursPerMonth, setMinHoursPerMonth] = useState<string>("")
  const [maxHoursPerMonth, setMaxHoursPerMonth] = useState<string>("")
  const [minDaysWorked, setMinDaysWorked] = useState<string>("")
  const [dateRangeStart, setDateRangeStart] = useState<string>("")
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("")
  const [filterMode, setFilterMode] = useState<"day" | "week" | "month">("day")
  
  const router = useRouter()

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin")
    if (!isAdmin) {
      router.push("/admin/login")
      return
    }

    loadData()
  }, [router])

  const loadData = () => {
    const empRegistrations = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    const records = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")

    setEmployees(empRegistrations)
    setAttendanceRecords(records)
  }

  // Thêm function tính toán thời gian làm việc
  const calculateWorkingTime = (checkInTime: string, checkOutTime: string) => {
    const checkIn = new Date(checkInTime)
    const checkOut = new Date(checkOutTime)
    const diffMs = checkOut.getTime() - checkIn.getTime()

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    return { hours, minutes, seconds, totalMinutes: Math.floor(diffMs / (1000 * 60)) }
  }

  // Function lấy thống kê giờ làm việc
  const getWorkingHoursStats = () => {
    const filteredRecords = attendanceRecords.filter((record) => {
      const recordDate = new Date(record.timestamp).toISOString().split("T")[0]
      return recordDate === selectedDate
    })

    // Nhóm theo nhân viên
    const employeeRecords = filteredRecords.reduce(
      (acc, record) => {
        if (!acc[record.employeeId]) {
          acc[record.employeeId] = {
            employee: employees.find((emp) => emp.id === record.employeeId),
            records: [],
          }
        }
        acc[record.employeeId].records.push(record)
        return acc
      },
      {} as Record<string, { employee: any; records: AttendanceRecord[] }>,
    )

    const workingHoursData = []

    for (const [employeeId, data] of Object.entries(employeeRecords)) {
      if (!data.employee) continue

      const checkIns = data.records
        .filter((r) => r.type === "check-in")
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const checkOuts = data.records
        .filter((r) => r.type === "check-out")
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      let totalWorkingMinutes = 0
      const sessions = []

      for (let i = 0; i < Math.min(checkIns.length, checkOuts.length); i++) {
        const workTime = calculateWorkingTime(checkIns[i].timestamp, checkOuts[i].timestamp)
        totalWorkingMinutes += workTime.totalMinutes
        sessions.push({
          checkIn: checkIns[i].timestamp,
          checkOut: checkOuts[i].timestamp,
          duration: workTime,
        })
      }

      workingHoursData.push({
        employee: data.employee,
        totalMinutes: totalWorkingMinutes,
        totalHours: Math.floor(totalWorkingMinutes / 60),
        remainingMinutes: totalWorkingMinutes % 60,
        sessions,
        isShortWork: totalWorkingMinutes > 0 && totalWorkingMinutes < 60,
      })
    }

    return workingHoursData.sort((a, b) => a.totalMinutes - b.totalMinutes)
  }

  const getDepartmentStats = () => {
    const departmentStats = employees
      .filter((emp) => emp.status === "approved")
      .reduce(
        (acc, emp) => {
          acc[emp.department] = (acc[emp.department] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    return Object.entries(departmentStats).map(([dept, count]) => ({
      name: dept,
      value: count,
      percentage: Math.round((count / employees.filter((emp) => emp.status === "approved").length) * 100),
    }))
  }

  const getHourlyStats = () => {
    const hourlyStats = attendanceRecords
      .filter((record) => {
        const recordDate = new Date(record.timestamp).toDateString()
        const selectedDateObj = new Date(selectedDate).toDateString()
        return recordDate === selectedDateObj
      })
      .reduce(
        (acc, record) => {
          const hour = new Date(record.timestamp).getHours()
          const key = `${hour.toString().padStart(2, "0")}:00`
          acc[key] = (acc[key] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    return Object.entries(hourlyStats)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => Number.parseInt(a.hour) - Number.parseInt(b.hour))
  }

  const getMonthlyTrend = () => {
    const monthlyStats = attendanceRecords
      .filter((record) => {
        const recordMonth = new Date(record.timestamp).toISOString().slice(0, 7)
        return recordMonth === selectedMonth
      })
      .reduce(
        (acc, record) => {
          const date = new Date(record.timestamp).toISOString().split("T")[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    return Object.entries(monthlyStats)
      .map(([date, count]) => ({
        date: new Date(date).getDate().toString(),
        count,
        fullDate: date,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
  }

  const getDepartmentAttendance = () => {
    const deptAttendance = attendanceRecords
      .filter((record) => {
        const recordDate = new Date(record.timestamp).toDateString()
        const selectedDateObj = new Date(selectedDate).toDateString()
        return recordDate === selectedDateObj
      })
      .reduce(
        (acc, record) => {
          const employee = employees.find((emp) => emp.id === record.employeeId)
          if (employee) {
            const dept = employee.department
            if (!acc[dept]) {
              acc[dept] = { checkIn: 0, checkOut: 0 }
            }
            if (record.type === "check-in") {
              acc[dept].checkIn++
            } else {
              acc[dept].checkOut++
            }
          }
          return acc
        },
        {} as Record<string, { checkIn: number; checkOut: number }>,
      )

    return Object.entries(deptAttendance).map(([dept, stats]) => ({
      department: dept,
      checkIn: stats.checkIn,
      checkOut: stats.checkOut,
      total: stats.checkIn + stats.checkOut,
    }))
  }

  const getFilteredRecords = () => {
    return attendanceRecords.filter(
      (record) => new Date(record.timestamp).toDateString() === new Date(selectedDate).toDateString(),
    )
  }

  // Get records within a date range
  const getRecordsInDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= start && recordDate <= new Date(endDate + "T23:59:59");
    });
  }

  // Get records for the current week of selected date
  const getWeekRecords = () => {
    const selectedDateObj = new Date(selectedDate);
    const startOfWeek = new Date(selectedDateObj);
    startOfWeek.setDate(selectedDateObj.getDate() - selectedDateObj.getDay()); // Sunday as first day
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday as last day
    
    return getRecordsInDateRange(
      startOfWeek.toISOString().split('T')[0], 
      endOfWeek.toISOString().split('T')[0]
    );
  }

  // Get records for the current month of selected date
  const getMonthRecords = () => {
    const selectedDateObj = new Date(selectedDate);
    const startOfMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
    const endOfMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth() + 1, 0);
    
    return getRecordsInDateRange(
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );
  }
  
  // Calculate working hours for a set of records
  const calculateWorkingHoursForRecords = (records: AttendanceRecord[]) => {
    // Group by employee and day
    const employeeRecordsByDay: Record<string, Record<string, AttendanceRecord[]>> = {};
    
    records.forEach(record => {
      const employeeId = record.employeeId;
      const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
      
      if (!employeeRecordsByDay[employeeId]) {
        employeeRecordsByDay[employeeId] = {};
      }
      
      if (!employeeRecordsByDay[employeeId][recordDate]) {
        employeeRecordsByDay[employeeId][recordDate] = [];
      }
      
      employeeRecordsByDay[employeeId][recordDate].push(record);
    });
    
    // Calculate working hours
    const employeeStats: Record<string, {
      employeeId: string,
      employeeName: string,
      totalMinutesPerDay: Record<string, number>,
      totalMinutes: number,
      daysWorked: number
    }> = {};
    
    Object.entries(employeeRecordsByDay).forEach(([employeeId, daysRecords]) => {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;
      
      const stats = {
        employeeId,
        employeeName: employee.name,
        totalMinutesPerDay: {} as Record<string, number>,
        totalMinutes: 0,
        daysWorked: 0
      };
      
      Object.entries(daysRecords).forEach(([date, dayRecords]) => {
        const checkIns = dayRecords
          .filter(r => r.type === "check-in")
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
        const checkOuts = dayRecords
          .filter(r => r.type === "check-out")
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        let dayMinutes = 0;
        
        for (let i = 0; i < Math.min(checkIns.length, checkOuts.length); i++) {
          const workTime = calculateWorkingTime(checkIns[i].timestamp, checkOuts[i].timestamp);
          dayMinutes += workTime.totalMinutes;
        }
        
        if (dayMinutes > 0) {
          stats.totalMinutesPerDay[date] = dayMinutes;
          stats.totalMinutes += dayMinutes;
          stats.daysWorked++;
        }
      });
      
      employeeStats[employeeId] = stats;
    });
    
    return employeeStats;
  }
  
  // Apply advanced filters to get filtered employee stats
  const getFilteredEmployeeStats = () => {
    let recordsToFilter;
    
    if (dateRangeStart && dateRangeEnd) {
      recordsToFilter = getRecordsInDateRange(dateRangeStart, dateRangeEnd);
    } else {
      switch (filterMode) {
        case 'day':
          recordsToFilter = getFilteredRecords();
          break;
        case 'week':
          recordsToFilter = getWeekRecords();
          break;
        case 'month':
          recordsToFilter = getMonthRecords();
          break;
      }
    }
    
    // Filter by department if selected
    if (selectedDepartment !== 'all') {
      recordsToFilter = recordsToFilter.filter(record => {
        const employee = employees.find(emp => emp.id === record.employeeId);
        return employee && employee.department === selectedDepartment;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      recordsToFilter = recordsToFilter.filter(record => {
        return record.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) || 
               record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    // Calculate stats for these records
    const employeeStats = calculateWorkingHoursForRecords(recordsToFilter);
    
    // Apply advanced filters
    return Object.values(employeeStats).filter(stats => {
      // Filter by hours per day
      if (minHoursPerDay) {
        const minMinutes = parseFloat(minHoursPerDay) * 60;
        if (Object.values(stats.totalMinutesPerDay).some(minutes => minutes < minMinutes)) {
          return false;
        }
      }
      
      if (maxHoursPerDay) {
        const maxMinutes = parseFloat(maxHoursPerDay) * 60;
        if (Object.values(stats.totalMinutesPerDay).some(minutes => minutes > maxMinutes)) {
          return false;
        }
      }
      
      // Filter by total hours (week/month)
      if (minHoursPerWeek && filterMode === 'week') {
        const minMinutes = parseFloat(minHoursPerWeek) * 60;
        if (stats.totalMinutes < minMinutes) return false;
      }
      
      if (maxHoursPerWeek && filterMode === 'week') {
        const maxMinutes = parseFloat(maxHoursPerWeek) * 60;
        if (stats.totalMinutes > maxMinutes) return false;
      }
      
      if (minHoursPerMonth && filterMode === 'month') {
        const minMinutes = parseFloat(minHoursPerMonth) * 60;
        if (stats.totalMinutes < minMinutes) return false;
      }
      
      if (maxHoursPerMonth && filterMode === 'month') {
        const maxMinutes = parseFloat(maxHoursPerMonth) * 60;
        if (stats.totalMinutes > maxMinutes) return false;
      }
      
      // Filter by days worked
      if (minDaysWorked) {
        const minDays = parseInt(minDaysWorked);
        if (stats.daysWorked < minDays) return false;
      }
      
      return true;
    });
  }

  // Handle checkbox selection for attendance records
  const handleSelectRecord = (recordId: string, checked: boolean) => {
    setSelectedRecords(prev => ({
      ...prev,
      [recordId]: checked
    }));
  };

  // Handle select all records checkbox
  const handleSelectAllRecords = (checked: boolean) => {
    setSelectAllRecords(checked);
    
    if (checked) {
      const allRecords = getFilteredRecords().reduce((acc, record) => {
        acc[record.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      
      setSelectedRecords(allRecords);
    } else {
      setSelectedRecords({});
    }
  };

  // Handle batch deletion of selected records
  const handleBatchDelete = () => {
    const selectedIds = Object.entries(selectedRecords)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất một bản ghi để xóa");
      return;
    }
    
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} bản ghi chấm công đã chọn?`)) {
      // Save records being deleted for undo functionality
      const recordsToDelete = attendanceRecords.filter(record => selectedIds.includes(record.id));
      setDeletedRecords(recordsToDelete);
      
      // Remove the records
      const updatedRecords = attendanceRecords.filter(record => !selectedIds.includes(record.id));
      setAttendanceRecords(updatedRecords);
      localStorage.setItem("attendanceRecords", JSON.stringify(updatedRecords));
      
      // Reset selection
      setSelectedRecords({});
      setSelectAllRecords(false);
      
      // Show undo option
      setShowUndoAlert(true);
      
      // Auto-hide undo alert after 10 seconds
      setTimeout(() => {
        setShowUndoAlert(false);
      }, 10000);
    }
  };

  // Handle undo deletion
  const handleUndoDelete = () => {
    if (deletedRecords.length === 0) return;
    
    // Restore the deleted records
    const restoredRecords = [...attendanceRecords, ...deletedRecords];
    setAttendanceRecords(restoredRecords);
    localStorage.setItem("attendanceRecords", JSON.stringify(restoredRecords));
    
    // Clear deleted records and hide undo alert
    setDeletedRecords([]);
    setShowUndoAlert(false);
    
    alert(`Đã khôi phục ${deletedRecords.length} bản ghi chấm công`);
  };

  const exportToPDF = async () => {
    try {
      const filteredRecords = getFilteredRecords();
      
      // Tạo thông tin báo cáo
      const reportInfo = [
        { label: "Ngày báo cáo", value: new Date(selectedDate).toLocaleDateString("vi-VN") },
        { label: "Thời gian xuất", value: new Date().toLocaleString("vi-VN") },
        { label: "Tổng số nhân viên", value: employees.filter((emp) => emp.status === "approved").length.toString() },
        { label: "Tổng lượt chấm công", value: filteredRecords.length.toString() },
        { label: "Số phòng ban", value: [...new Set(employees.map((emp) => emp.department))].length.toString() }
      ];
      
      // Tên file
      const fileName = `bao_cao_cham_cong_${selectedDate}.pdf`;
      
      // Import và sử dụng pdfGenerator
      const pdfGenerator = await import("@/lib/pdfGenerator");
      pdfGenerator.createDetailedReport(filteredRecords, reportInfo, fileName);
      
      alert("Xuất PDF thành công!");
    } catch (error) {
      console.error("Export error:", error);
      alert("Lỗi khi xuất PDF. Vui lòng thử lại.");
    }
  };

  const exportToExcel = async () => {
    try {
      const filteredRecords = getFilteredRecords()
      const workingHoursData = getWorkingHoursStats()

      // Tạo CSV content với nhiều section
      const csvSections = []

      // Section 1: Chi tiết chấm công với giờ làm việc
      csvSections.push("=== CHI TIẾT CHẤM CÔNG VỚI GIỜ LÀM VIỆC ===")
      csvSections.push(
        "STT,Mã nhân viên,Tên nhân viên,Phòng ban,Ca làm việc,Giờ vào,Giờ ra,Thời gian làm việc,Tổng phút,Cảnh báo,Ngày,Mã dưới vạch",
      )

      let stt = 1
      workingHoursData.forEach((empData) => {
        empData.sessions.forEach((session: any, index: number) => {
          const row = [
            stt++,
            empData.employee.id,
            empData.employee.name,
            empData.employee.department,
            `Ca ${index + 1}`,
            new Date(session.checkIn).toLocaleTimeString("vi-VN"),
            new Date(session.checkOut).toLocaleTimeString("vi-VN"),
            `${session.duration.hours}h ${session.duration.minutes}m ${session.duration.seconds}s`,
            session.duration.totalMinutes,
            session.duration.totalMinutes < 60 ? "Dưới 1 tiếng" : "Bình thường",
            new Date(session.checkIn).toLocaleDateString("vi-VN"),
            empData.employee.uniqueCode || "N/A",
          ]
          csvSections.push(row.join(","))
        })
      })

      // Section 2: Tổng hợp giờ làm việc theo nhân viên
      csvSections.push("")
      csvSections.push("=== TỔNG HỢP GIỜ LÀM VIỆC THEO NHÂN VIÊN ===")
      csvSections.push(
        "STT,Mã nhân viên,Tên nhân viên,Phòng ban,Tổng giờ làm việc,Tổng phút,Số ca làm việc,Trạng thái,Ngày",
      )

      workingHoursData.forEach((empData, index) => {
        const row = [
          index + 1,
          empData.employee.id,
          empData.employee.name,
          empData.employee.department,
          `${empData.totalHours}h ${empData.remainingMinutes}m`,
          empData.totalMinutes,
          empData.sessions.length,
          empData.isShortWork ? "Cảnh báo - Dưới 1 tiếng" : "Bình thường",
          new Date(selectedDate).toLocaleDateString("vi-VN"),
        ]
        csvSections.push(row.join(","))
      })

      // Section 3: Cảnh báo làm việc dưới 1 tiếng
      const warningData = workingHoursData.filter((empData) => empData.isShortWork)
      csvSections.push("")
      csvSections.push("=== CẢNH BÁO LÀM VIỆC DƯỚI 1 TIẾNG ===")
      csvSections.push("STT,Mã nhân viên,Tên nhân viên,Phòng ban,Thời gian làm việc,Tổng phút,Thiếu,Ghi chú,Ngày")

      warningData.forEach((empData, index) => {
        const row = [
          index + 1,
          empData.employee.id,
          empData.employee.name,
          empData.employee.department,
          `${empData.totalHours}h ${empData.remainingMinutes}m`,
          empData.totalMinutes,
          `${60 - empData.totalMinutes} phút`,
          "Làm việc dưới 1 tiếng",
          new Date(selectedDate).toLocaleDateString("vi-VN"),
        ]
        csvSections.push(row.join(","))
      })

      // Section 4: Thống kê tổng quan
      csvSections.push("")
      csvSections.push("=== THỐNG KÊ TỔNG QUAN ===")
      csvSections.push("Chỉ số,Giá trị")

      const overviewData = [
        ["Tổng số nhân viên hoạt động", employees.filter((emp) => emp.status === "approved").length],
        ["Tổng lượt chấm công hôm nay", filteredRecords.length],
        [
          "Số nhân viên đã vào làm",
          [...new Set(filteredRecords.filter((r) => r.type === "check-in").map((r) => r.employeeId))].length,
        ],
        [
          "Số nhân viên đã ra về",
          [...new Set(filteredRecords.filter((r) => r.type === "check-out").map((r) => r.employeeId))].length,
        ],
        ["Số cảnh báo dưới 1 tiếng", warningData.length],
        ["Số phòng ban", [...new Set(employees.map((emp) => emp.department))].length],
        ["Ngày báo cáo", new Date(selectedDate).toLocaleDateString("vi-VN")],
        ["Thời gian xuất báo cáo", new Date().toLocaleString("vi-VN")],
      ]

      overviewData.forEach((row) => {
        csvSections.push(row.join(","))
      })

      // Tạo file CSV
      const csvContent = csvSections.join("\n")
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `bao_cao_cham_cong_chi_tiet_${selectedDate}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert("Xuất file CSV chi tiết thành công!")
    } catch (error) {
      console.error("Export error:", error)
      alert("Lỗi khi xuất file. Vui lòng thử lại.")
    }
  }

  const exportFilteredToPDF = async () => {
    try {
      const filteredStats = getFilteredEmployeeStats();
      
      // Tạo thông tin bộ lọc
      const filterInfo = [];
      
      if (filterMode === "day") {
        filterInfo.push({ label: "Ngày", value: new Date(selectedDate).toLocaleDateString("vi-VN") });
      } else if (filterMode === "week") {
        const selectedDateObj = new Date(selectedDate);
        const startOfWeek = new Date(selectedDateObj);
        startOfWeek.setDate(selectedDateObj.getDate() - selectedDateObj.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        filterInfo.push({ 
          label: "Tuần", 
          value: `${startOfWeek.toLocaleDateString("vi-VN")} đến ${endOfWeek.toLocaleDateString("vi-VN")}` 
        });
      } else if (filterMode === "month") {
        filterInfo.push({ 
          label: "Tháng", 
          value: new Date(selectedDate).toLocaleDateString("vi-VN", { month: 'long', year: 'numeric' }) 
        });
      }
      
      if (dateRangeStart && dateRangeEnd) {
        filterInfo.push({ 
          label: "Khoảng thời gian", 
          value: `${new Date(dateRangeStart).toLocaleDateString("vi-VN")} đến ${new Date(dateRangeEnd).toLocaleDateString("vi-VN")}` 
        });
      }
      
      if (minHoursPerDay) filterInfo.push({ label: "Số giờ làm tối thiểu mỗi ngày", value: `${minHoursPerDay}h` });
      if (maxHoursPerDay) filterInfo.push({ label: "Số giờ làm tối đa mỗi ngày", value: `${maxHoursPerDay}h` });
      if (minHoursPerWeek && filterMode === "week") filterInfo.push({ label: "Số giờ làm tối thiểu trong tuần", value: `${minHoursPerWeek}h` });
      if (maxHoursPerWeek && filterMode === "week") filterInfo.push({ label: "Số giờ làm tối đa trong tuần", value: `${maxHoursPerWeek}h` });
      if (minHoursPerMonth && filterMode === "month") filterInfo.push({ label: "Số giờ làm tối thiểu trong tháng", value: `${minHoursPerMonth}h` });
      if (maxHoursPerMonth && filterMode === "month") filterInfo.push({ label: "Số giờ làm tối đa trong tháng", value: `${maxHoursPerMonth}h` });
      if (minDaysWorked) filterInfo.push({ label: "Số ngày làm việc tối thiểu", value: `${minDaysWorked} ngày` });
      
      filterInfo.push({ label: "Thời gian xuất", value: new Date().toLocaleString("vi-VN") });
      
      // Tên file
      const fileName = dateRangeStart && dateRangeEnd 
        ? `bao_cao_cham_cong_${dateRangeStart}_den_${dateRangeEnd}.pdf`
        : `bao_cao_cham_cong_${filterMode}_${selectedDate}.pdf`;
  
      // Import và sử dụng pdfGenerator
      const pdfGenerator = await import("@/lib/pdfGenerator");
      pdfGenerator.createFilteredReport(filteredStats, filterInfo, fileName);
      
      alert("Xuất PDF thành công!");
    } catch (error) {
      console.error("Export error:", error);
      alert("Lỗi khi xuất PDF. Vui lòng thử lại.");
    }
  };
  

  // Export filtered data to Excel
  const exportFilteredToExcel = async () => {
    try {
      const filteredStats = getFilteredEmployeeStats();
      
      // Create CSV sections
      const csvSections = [];
      
      // Header
      csvSections.push("BÁO CÁO CHẤM CÔNG CHI TIẾT (ĐÃ LỌC)");
      csvSections.push("");
      
      // Filter information
      csvSections.push("THÔNG TIN BỘ LỌC:");
      
      if (filterMode === "day") {
        csvSections.push(`Ngày:,${new Date(selectedDate).toLocaleDateString("vi-VN")}`);
      } else if (filterMode === "week") {
        const selectedDateObj = new Date(selectedDate);
        const startOfWeek = new Date(selectedDateObj);
        startOfWeek.setDate(selectedDateObj.getDate() - selectedDateObj.getDay());
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        csvSections.push(`Tuần:,${startOfWeek.toLocaleDateString("vi-VN")} đến ${endOfWeek.toLocaleDateString("vi-VN")}`);
      } else if (filterMode === "month") {
        csvSections.push(`Tháng:,${new Date(selectedDate).toLocaleDateString("vi-VN", { month: 'long', year: 'numeric' })}`);
      }
      
      if (dateRangeStart && dateRangeEnd) {
        csvSections.push(`Khoảng thời gian:,${new Date(dateRangeStart).toLocaleDateString("vi-VN")} đến ${new Date(dateRangeEnd).toLocaleDateString("vi-VN")}`);
      }
      
      if (minHoursPerDay) csvSections.push(`Số giờ làm tối thiểu mỗi ngày:,${minHoursPerDay}h`);
      if (maxHoursPerDay) csvSections.push(`Số giờ làm tối đa mỗi ngày:,${maxHoursPerDay}h`);
      if (minHoursPerWeek && filterMode === "week") csvSections.push(`Số giờ làm tối thiểu trong tuần:,${minHoursPerWeek}h`);
      if (maxHoursPerWeek && filterMode === "week") csvSections.push(`Số giờ làm tối đa trong tuần:,${maxHoursPerWeek}h`);
      if (minHoursPerMonth && filterMode === "month") csvSections.push(`Số giờ làm tối thiểu trong tháng:,${minHoursPerMonth}h`);
      if (maxHoursPerMonth && filterMode === "month") csvSections.push(`Số giờ làm tối đa trong tháng:,${maxHoursPerMonth}h`);
      if (minDaysWorked) csvSections.push(`Số ngày làm việc tối thiểu:,${minDaysWorked} ngày`);
      
      csvSections.push(`Thời gian xuất:,${new Date().toLocaleString("vi-VN")}`);
      csvSections.push("");
      
      // Employee data
      csvSections.push("KẾT QUẢ LỌC:");
      csvSections.push("STT,Mã NV,Tên nhân viên,Phòng ban,Tổng giờ làm,Tổng phút làm,Số ngày làm việc");
      
      filteredStats.forEach((stat, index) => {
        const row = [
          index + 1,
          stat.employeeId,
          stat.employeeName,
          employees.find(emp => emp.id === stat.employeeId)?.department || "",
          `${Math.floor(stat.totalMinutes / 60)}h ${stat.totalMinutes % 60}m`,
          stat.totalMinutes,
          stat.daysWorked
        ];
        
        csvSections.push(row.join(","));
      });
      
      // Chi tiết ngày làm việc cho mỗi nhân viên đã lọc
      csvSections.push("");
      csvSections.push("CHI TIẾT NGÀY LÀM VIỆC:");
      csvSections.push("Mã NV,Tên nhân viên,Ngày làm việc,Số giờ làm,Số phút làm");
      
      filteredStats.forEach(stat => {
        Object.entries(stat.totalMinutesPerDay).forEach(([date, minutes]) => {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          
          const row = [
            stat.employeeId,
            stat.employeeName,
            new Date(date).toLocaleDateString("vi-VN"),
            hours,
            mins
          ];
          
          csvSections.push(row.join(","));
        });
      });
      
      // Tạo file CSV
      const csvContent = csvSections.join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      const fileName = dateRangeStart && dateRangeEnd 
        ? `bao_cao_cham_cong_${dateRangeStart}_den_${dateRangeEnd}.csv`
        : `bao_cao_cham_cong_${filterMode}_${selectedDate}.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert("Xuất Excel thành công!");
    } catch (error) {
      console.error("Export error:", error);
      alert("Lỗi khi xuất file. Vui lòng thử lại.");
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

  const departmentStats = getDepartmentStats()
  const hourlyStats = getHourlyStats()
  const monthlyTrend = getMonthlyTrend()
  const departmentAttendance = getDepartmentAttendance()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại Admin
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Báo cáo và Thống kê Chi tiết</CardTitle>
            <CardDescription>Phân tích dữ liệu chấm công với biểu đồ và báo cáo</CardDescription>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="reportDate">Ngày báo cáo</Label>
                <Input
                  id="reportDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reportMonth">Tháng báo cáo</Label>
                <Input
                  id="reportMonth"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="department">Phòng ban</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả phòng ban</SelectItem>
                    {[...new Set(employees.map((emp) => emp.department))].map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={exportToPDF} variant="outline" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button onClick={exportToExcel} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="department">
              <PieChartIcon className="w-4 h-4 mr-2" />
              Theo phòng ban
            </TabsTrigger>
            <TabsTrigger value="hourly">
              <BarChart3 className="w-4 h-4 mr-2" />
              Theo giờ
            </TabsTrigger>
            <TabsTrigger value="working-hours">
              <Clock className="w-4 h-4 mr-2" />
              Giờ làm việc
            </TabsTrigger>
            <TabsTrigger value="trend">
              <TrendingUp className="w-4 h-4 mr-2" />
              Xu hướng
            </TabsTrigger>
            <TabsTrigger value="records">
              <FileText className="w-4 h-4 mr-2" />
              Chi tiết chấm công
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố nhân viên theo phòng ban</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chấm công theo phòng ban ({new Date(selectedDate).toLocaleDateString("vi-VN")})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentAttendance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="checkIn" fill="#00C49F" name="Vào làm" />
                      <Bar dataKey="checkOut" fill="#FF8042" name="Ra về" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="department">
            <Card>
              <CardHeader>
                <CardTitle>Thống kê chi tiết theo phòng ban</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentAttendance.map((dept, index) => (
                    <div key={dept.department} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-lg">{dept.department}</h3>
                        <div className="text-sm text-gray-500">Tổng: {dept.total} lượt</div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-2xl font-bold text-green-600">{dept.checkIn}</p>
                          <p className="text-sm text-green-700">Vào làm</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <p className="text-2xl font-bold text-red-600">{dept.checkOut}</p>
                          <p className="text-sm text-red-700">Ra về</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-2xl font-bold text-blue-600">
                            {dept.checkOut > 0 ? Math.round((dept.checkOut / dept.checkIn) * 100) : 0}%
                          </p>
                          <p className="text-sm text-blue-700">Hoàn thành</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hourly">
            <Card>
              <CardHeader>
                <CardTitle>
                  Thống kê chấm công theo giờ ({new Date(selectedDate).toLocaleDateString("vi-VN")})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={hourlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Số lượt chấm công" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="working-hours">
            <Card>
              <CardHeader>
                <CardTitle>Thống kê giờ làm việc ({new Date(selectedDate).toLocaleDateString("vi-VN")})</CardTitle>
                <CardDescription>Chi tiết thời gian làm việc của từng nhân viên và cảnh báo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getWorkingHoursStats().map((empData, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        empData.isShortWork ? "border-yellow-300 bg-yellow-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {empData.employee.name}
                            {empData.isShortWork && (
                              <Badge variant="destructive" className="text-xs">
                                Cảnh báo
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {empData.employee.id} - {empData.employee.department}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {empData.totalHours}h {empData.remainingMinutes}m
                          </p>
                          <p className="text-sm text-gray-500">{empData.sessions.length} ca làm việc</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {empData.sessions.map((session: any, sessionIndex: number) => (
                          <div
                            key={sessionIndex}
                            className="flex justify-between items-center p-2 bg-white rounded text-sm"
                          >
                            <div className="flex gap-4">
                              <span>Ca {sessionIndex + 1}:</span>
                              <span className="text-green-600">
                                {new Date(session.checkIn).toLocaleTimeString("vi-VN")}
                              </span>
                              <span>→</span>
                              <span className="text-red-600">
                                {new Date(session.checkOut).toLocaleTimeString("vi-VN")}
                              </span>
                            </div>
                            <Badge
                              variant={session.duration.totalMinutes < 60 ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {session.duration.hours}h {session.duration.minutes}m {session.duration.seconds}s
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {empData.isShortWork && (
                        <div className="mt-3 p-2 bg-yellow-100 rounded text-sm text-yellow-800">
                          ⚠️ Nhân viên này làm việc dưới 1 tiếng. Thiếu {60 - empData.totalMinutes} phút.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>
                  Xu hướng chấm công theo tháng (
                  {new Date(selectedMonth).toLocaleDateString("vi-VN", { year: "numeric", month: "long" })})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} name="Số lượt chấm công" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Chi tiết chấm công ({new Date(selectedDate).toLocaleDateString("vi-VN")})</CardTitle>
                <CardDescription>Danh sách tất cả các lượt chấm công</CardDescription>
                
                {/* Search and advanced filter UI */}
                <div className="mt-4 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Tìm kiếm theo tên, mã nhân viên..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="md:w-auto w-full"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {showAdvancedFilters ? "Ẩn bộ lọc nâng cao" : "Bộ lọc nâng cao"}
                    </Button>
                  </div>
                  
                  {showAdvancedFilters && (
                    <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Phạm vi thời gian:</h3>
                        <div className="flex gap-2">
                          <Button 
                            variant={filterMode === "day" ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setFilterMode("day")}
                          >
                            Ngày
                          </Button>
                          <Button 
                            variant={filterMode === "week" ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setFilterMode("week")}
                          >
                            Tuần
                          </Button>
                          <Button 
                            variant={filterMode === "month" ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setFilterMode("month")}
                          >
                            Tháng
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Filter giờ làm mỗi ngày */}
                        <div className="space-y-2">
                          <Label>Số giờ làm mỗi ngày:</Label>
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="number" 
                              placeholder="Tối thiểu"
                              value={minHoursPerDay}
                              onChange={(e) => setMinHoursPerDay(e.target.value)}
                              min="0"
                              step="0.5"
                              className="w-24"
                            />
                            <span>đến</span>
                            <Input 
                              type="number" 
                              placeholder="Tối đa"
                              value={maxHoursPerDay}
                              onChange={(e) => setMaxHoursPerDay(e.target.value)}
                              min="0"
                              step="0.5"
                              className="w-24"
                            />
                            <span>giờ</span>
                          </div>
                        </div>
                        
                        {/* Filter số ngày làm */}
                        <div className="space-y-2">
                          <Label>Số ngày làm việc tối thiểu:</Label>
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="number" 
                              placeholder="Số ngày"
                              value={minDaysWorked}
                              onChange={(e) => setMinDaysWorked(e.target.value)}
                              min="0"
                              step="1"
                              className="w-24"
                            />
                            <span>ngày</span>
                          </div>
                        </div>
                        
                        {/* Filter giờ làm theo tuần/tháng - chỉ hiển thị khi filter mode phù hợp */}
                        {filterMode === "week" && (
                          <div className="space-y-2">
                            <Label>Tổng số giờ làm trong tuần:</Label>
                            <div className="flex gap-2 items-center">
                              <Input 
                                type="number" 
                                placeholder="Tối thiểu"
                                value={minHoursPerWeek}
                                onChange={(e) => setMinHoursPerWeek(e.target.value)}
                                min="0"
                                step="0.5"
                                className="w-24"
                              />
                              <span>đến</span>
                              <Input 
                                type="number" 
                                placeholder="Tối đa"
                                value={maxHoursPerWeek}
                                onChange={(e) => setMaxHoursPerWeek(e.target.value)}
                                min="0"
                                step="0.5"
                                className="w-24"
                              />
                              <span>giờ</span>
                            </div>
                          </div>
                        )}
                        
                        {filterMode === "month" && (
                          <div className="space-y-2">
                            <Label>Tổng số giờ làm trong tháng:</Label>
                            <div className="flex gap-2 items-center">
                              <Input 
                                type="number" 
                                placeholder="Tối thiểu"
                                value={minHoursPerMonth}
                                onChange={(e) => setMinHoursPerMonth(e.target.value)}
                                min="0"
                                step="0.5"
                                className="w-24"
                              />
                              <span>đến</span>
                              <Input 
                                type="number" 
                                placeholder="Tối đa"
                                value={maxHoursPerMonth}
                                onChange={(e) => setMaxHoursPerMonth(e.target.value)}
                                min="0"
                                step="0.5"
                                className="w-24"
                              />
                              <span>giờ</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Filter theo khoảng thời gian tùy chọn */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Khoảng thời gian tùy chọn:</Label>
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="date" 
                              value={dateRangeStart}
                              onChange={(e) => setDateRangeStart(e.target.value)}
                              className="w-auto"
                            />
                            <span>đến</span>
                            <Input 
                              type="date"
                              value={dateRangeEnd}
                              onChange={(e) => setDateRangeEnd(e.target.value)}
                              className="w-auto"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSearchTerm("");
                            setMinHoursPerDay("");
                            setMaxHoursPerDay("");
                            setMinHoursPerWeek("");
                            setMaxHoursPerWeek("");
                            setMinHoursPerMonth("");
                            setMaxHoursPerMonth("");
                            setMinDaysWorked("");
                            setDateRangeStart("");
                            setDateRangeEnd("");
                            setFilterMode("day");
                          }}
                        >
                          Xóa bộ lọc
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button onClick={() => exportFilteredToPDF()} variant="outline">
                            <FileText className="w-4 h-4 mr-2" />
                            Xuất PDF
                          </Button>
                          <Button onClick={() => exportFilteredToExcel()}>
                            <Download className="w-4 h-4 mr-2" />
                            Xuất Excel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Advanced search results display */}
                  {(showAdvancedFilters && (
                    minHoursPerDay || maxHoursPerDay || minHoursPerWeek || maxHoursPerWeek || 
                    minHoursPerMonth || maxHoursPerMonth || minDaysWorked || 
                    dateRangeStart || dateRangeEnd || filterMode !== "day" || searchTerm
                  )) && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium text-lg mb-3">Kết quả lọc nâng cao</h3>
                      <div className="space-y-4">
                        {getFilteredEmployeeStats().length > 0 ? (
                          <>
                            <p className="text-sm text-gray-500">
                              Tìm thấy {getFilteredEmployeeStats().length} nhân viên phù hợp với điều kiện lọc.
                            </p>
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Mã NV</TableHead>
                                    <TableHead>Tên nhân viên</TableHead>
                                    <TableHead>Phòng ban</TableHead>
                                    <TableHead>Tổng giờ làm</TableHead>
                                    <TableHead>Số ngày làm</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getFilteredEmployeeStats().map((stat) => (
                                    <TableRow key={stat.employeeId}>
                                      <TableCell className="font-mono">{stat.employeeId}</TableCell>
                                      <TableCell>{stat.employeeName}</TableCell>
                                      <TableCell>
                                        {employees.find(emp => emp.id === stat.employeeId)?.department || "N/A"}
                                      </TableCell>
                                      <TableCell>
                                        {Math.floor(stat.totalMinutes / 60)}h {stat.totalMinutes % 60}m
                                      </TableCell>
                                      <TableCell>{stat.daysWorked} ngày</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-10 text-gray-500">
                            Không tìm thấy nhân viên nào phù hợp với điều kiện lọc
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chi tiết chấm công theo ngày (hiển thị khi không sử dụng bộ lọc nâng cao hoặc chỉ lọc cho ngày hiện tại) */}
                  {(!showAdvancedFilters || (showAdvancedFilters && filterMode === "day" && !dateRangeStart)) && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">
                              <Checkbox 
                                checked={selectAllRecords} 
                                onCheckedChange={handleSelectAllRecords}
                              />
                            </TableHead>
                            <TableHead className="w-[100px]">Mã NV</TableHead>
                            <TableHead>Tên nhân viên</TableHead>
                            <TableHead className="w-[80px]">Loại</TableHead>
                            <TableHead>Thời gian</TableHead>
                            <TableHead className="hidden md:table-cell">Địa điểm</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredRecords().length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                Không có dữ liệu chấm công nào cho ngày đã chọn
                              </TableCell>
                            </TableRow>
                          ) : (
                            getFilteredRecords()
                              .filter(record => {
                                // Apply search filter if present
                                if (!searchTerm) return true;
                                return (
                                  record.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  record.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
                                );
                              })
                              .sort(
                                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                              )
                              .map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell>
                                    <Checkbox 
                                      checked={!!selectedRecords[record.id]} 
                                      onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{record.employeeId}</TableCell>
                                  <TableCell>{record.employeeName}</TableCell>
                                  <TableCell>
                                    {record.type === "check-in" ? (
                                      <Badge variant="default">Vào</Badge>
                                    ) : (
                                      <Badge variant="secondary">Ra</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>{new Date(record.timestamp).toLocaleString("vi-VN")}</TableCell>
                                  <TableCell className="hidden md:table-cell">{record.location || "N/A"}</TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {/* Batch Actions and Undo Button */}
                  <div className="flex justify-between items-center">
                    <div>
                      {Object.values(selectedRecords).filter(Boolean).length > 0 && (
                        <p className="text-sm text-gray-500">
                          Đã chọn {Object.values(selectedRecords).filter(Boolean).length} bản ghi
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {showUndoAlert && (
                        <Button 
                          variant="outline"
                          onClick={handleUndoDelete}
                          className="flex items-center"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Hoàn tác xóa ({deletedRecords.length})
                        </Button>
                      )}
                      
                      <Button 
                        variant="destructive"
                        onClick={handleBatchDelete}
                        disabled={Object.values(selectedRecords).filter(Boolean).length === 0}
                        className="flex items-center"
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Xóa đã chọn
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
