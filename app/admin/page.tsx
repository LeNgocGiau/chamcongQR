"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  LogOut,
  Users,
  BarChart3,
  UserCheck,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  AlertTriangle,
  Mail,
  Send,
  FileText,
  User,
  History,
  ChevronDown,
  UserMinus,
  CalendarDays,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  UserX,
  UserCheck2,
  UserRound,
  X,
  Trash,
  RotateCcw
} from "lucide-react"
import { emailTemplates } from "@/lib/emailTemplates"
import { useCustomAlert } from "@/components/custom-alert"
import { useCustomConfirm } from "@/components/custom-confirm"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import Link from "next/link"

// Thêm interface cho EmployeeRegistration
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
  suspensionReason?: string
  suspensionStart?: string
  suspensionEnd?: string
}

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  type: "check-in" | "check-out"
  timestamp: string
  location?: string
  sentBy?: string
  templateId?: string
  faceImage?: string // Thêm trường để lưu hình ảnh khuôn mặt
}

// Templates email
interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
}

// Sent email history
interface SentEmail {
  id: string
  subject: string
  content: string
  recipients: string[]
  sentAt: string
  sentBy: string
  templateId?: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [employees, setEmployees] = useState<EmployeeRegistration[]>([])
  const [pendingEmployees, setPendingEmployees] = useState<EmployeeRegistration[]>([])
  const [approvedEmployees, setApprovedEmployees] = useState<EmployeeRegistration[]>([])
  const [rejectedEmployees, setRejectedEmployees] = useState<EmployeeRegistration[]>([])
  const [suspendedEmployees, setSuspendedEmployees] = useState<EmployeeRegistration[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailContent, setEmailContent] = useState("")
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, boolean>>({})
  const [selectAllEmployees, setSelectAllEmployees] = useState(false)
  const [previewEmail, setPreviewEmail] = useState<{
    subject: string
    content: string
    employee?: EmployeeRegistration
  } | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>("absent")
  const [emailHistory, setEmailHistory] = useState<SentEmail[]>([])
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspensionEmployee, setSuspensionEmployee] = useState<EmployeeRegistration | null>(null)
  const [suspensionReason, setSuspensionReason] = useState("")
  const [suspensionDuration, setSuspensionDuration] = useState<"1day" | "3days" | "7days" | "14days" | "30days" | "permanent">("1day")
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedAttendanceInfo, setSelectedAttendanceInfo] = useState<{
    employeeName: string;
    timestamp: string;
    type: "check-in" | "check-out";
  } | null>(null)
  // New state for selected records (for batch deletion)
  const [selectedRecords, setSelectedRecords] = useState<Record<string, boolean>>({})
  const [selectAllRecords, setSelectAllRecords] = useState(false)
  // New state for deleted records (for undo functionality)
  const [deletedRecords, setDeletedRecords] = useState<AttendanceRecord[]>([])
  const [showUndoAlert, setShowUndoAlert] = useState(false)
  // Adding missing state variables
  const [statusFilter, setStatusFilter] = useState("all")
  const [subjectSearchTerm, setSubjectSearchTerm] = useState("")
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  const [emailCardSearchTerms, setEmailCardSearchTerms] = useState<Record<string, string>>({})
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRegistration | null>(null)
  
  const router = useRouter()
  const { showAlert } = useCustomAlert();
  const { confirm } = useCustomConfirm();

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin")
    if (!isAdmin) {
      router.push("/admin/login")
      return
    }

    loadData()
  }, [router])

  useEffect(() => {
    // Kiểm tra nếu không có tài khoản chờ duyệt và đang ở tab chờ duyệt, chuyển sang tab nhân viên
    const pendingCount = employees.filter(emp => emp.status === "pending").length
    if (pendingCount === 0 && activeTab === "pending-approval") {
      setActiveTab("employees")
      const employeesTab = document.querySelector('[data-value="employees"]') as HTMLElement
      if (employeesTab) employeesTab.click()
    }
  }, [employees, activeTab])

  useEffect(() => {
    // Tự động cập nhật khi chọn template
    if (selectedEmailTemplate && selectedEmailTemplate !== 'new') {
      const template = emailTemplates.find(t => t.id === selectedEmailTemplate)
      if (template) {
        setEmailSubject(template.subject)
        setEmailContent(template.content)
      }
    }
  }, [selectedEmailTemplate])

  useEffect(() => {
    // Update selected employees when department changes
    if (selectedDepartments.length > 0) {
      const deptEmployees = employees
        .filter(emp => emp.status === 'approved' && selectedDepartments.includes(emp.department))
        .reduce((acc, emp) => {
          acc[emp.id] = true
          return acc
        }, {} as Record<string, boolean>)
      
      setSelectedEmployees(deptEmployees)
    } else {
      // Clear all employee selections when no departments are selected
      setSelectedEmployees({})
    }
  }, [selectedDepartments, employees])

  useEffect(() => {
    // Handle select all toggle
    if (selectAllEmployees) {
      const allEmployees = employees
        .filter(emp => emp.status === 'approved')
        .reduce((acc, emp) => {
          acc[emp.id] = true
          return acc
        }, {} as Record<string, boolean>)
      
      setSelectedEmployees(allEmployees)
    } else if (Object.keys(selectedEmployees).length === employees.filter(emp => emp.status === 'approved').length) {
      // If all employees were previously selected and selectAll was unchecked
      setSelectedEmployees({})
    }
  }, [selectAllEmployees, employees])

  const loadData = () => {
    const empRegistrations = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    const records = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")
    const emailHistory = JSON.parse(localStorage.getItem("sentEmails") || "[]")

    setEmployees(empRegistrations)
    setAttendanceRecords(records)
    setEmailHistory(emailHistory)
  }

  const handleApproveEmployee = (employeeId: string) => {
    const employeeName = employees.find(emp => emp.id === employeeId)?.name || 'Nhân viên';
    
    confirm({
      title: "Duyệt nhân viên",
      message: `Bạn có chắc chắn muốn duyệt tài khoản của ${employeeName}?`,
      confirmLabel: "Duyệt",
      type: "info",
      onConfirm: () => {
        const updatedEmployees = employees.map((emp) =>
          emp.id === employeeId ? { ...emp, status: "approved" as const } : emp,
        )
        setEmployees(updatedEmployees)
        localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))
        showAlert("Đã duyệt nhân viên thành công!", "success")
        
        // Chuyển tab sang Quản lý nhân viên
        const employeesTab = document.querySelector('[data-value="employees"]') as HTMLElement;
        if (employeesTab) employeesTab.click();
      }
    });
  }

  const handleRejectEmployee = (employeeId: string) => {
    const employeeName = employees.find(emp => emp.id === employeeId)?.name || 'Nhân viên';
    
    confirm({
      title: "Từ chối nhân viên",
      message: `Bạn có chắc chắn muốn từ chối tài khoản của ${employeeName}?`,
      confirmLabel: "Từ chối",
      type: "warning",
      onConfirm: () => {
        const updatedEmployees = employees.map((emp) =>
          emp.id === employeeId ? { ...emp, status: "rejected" as const } : emp,
        )
        setEmployees(updatedEmployees)
        localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))
        showAlert("Đã từ chối nhân viên!", "info")
      }
    });
  }

  const handleDeleteEmployee = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    const employeeName = employee?.name || 'Nhân viên';
    
    confirm({
      title: "Xóa nhân viên",
      message: `Bạn có chắc chắn muốn xóa ${employeeName}? Tất cả dữ liệu chấm công của nhân viên này cũng sẽ bị xóa và không thể khôi phục.`,
      confirmLabel: "Xóa",
      type: "delete",
      onConfirm: async () => {
        const updatedEmployees = employees.filter((emp) => emp.id !== employeeId)
        setEmployees(updatedEmployees)
        localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))

        // Xóa luôn các bản ghi chấm công
        const updatedRecords = attendanceRecords.filter((record) => record.employeeId !== employeeId)
        setAttendanceRecords(updatedRecords)
        localStorage.setItem("attendanceRecords", JSON.stringify(updatedRecords))

        // Gửi email thông báo xóa tài khoản
        if (employee && employee.email) {
          const deleteTemplate = emailTemplates.find(t => t.id === 'accountDeleted')
          if (deleteTemplate) {
            const deletedTime = new Date().toLocaleString("vi-VN")
            
            let emailContent = deleteTemplate.content
              .replace(/{employeeName}/g, employeeName)
              .replace(/{deletedTime}/g, deletedTime)

            try {
              await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: employee.email,
                  subject: deleteTemplate.subject,
                  html: emailContent,
                }),
              });
              console.log('Email thông báo xóa tài khoản đã được gửi đến:', employee.email);
            } catch (error) {
              console.error("Lỗi gửi email thông báo xóa tài khoản:", error);
            }
          }
        }

        showAlert("Đã xóa nhân viên và dữ liệu chấm công!", "success")
      }
    });
  }

  const handleLogout = () => {
    localStorage.removeItem("isAdmin")
    router.push("/")
  }

  const getFilteredRecords = () => {
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.timestamp).toISOString().split("T")[0]
      const matchesDate = recordDate === selectedDate
      const matchesSearch =
        searchTerm === "" ||
        (record.employeeId && record.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.employeeName && record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesDate && matchesSearch
    })
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

  // Function lấy danh sách nhân viên làm dưới 1 tiếng
  const getShortWorkEmployees = () => {
    const today = new Date().toDateString()
    const todayRecords = attendanceRecords.filter((record) => new Date(record.timestamp).toDateString() === today)

    // Nhóm theo nhân viên
    const employeeRecords = todayRecords.reduce(
      (acc, record) => {
        if (!acc[record.employeeId]) acc[record.employeeId] = []
        acc[record.employeeId].push(record)
        return acc
      },
      {} as Record<string, AttendanceRecord[]>,
    )

    const shortWorkList = []

    for (const [employeeId, records] of Object.entries(employeeRecords)) {
      const checkIns = records
        .filter((r) => r.type === "check-in")
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const checkOuts = records
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

      if (totalWorkingMinutes > 0 && totalWorkingMinutes < 60) {
        const employee = employees.find((emp) => emp.id === employeeId)
        if (employee) {
          shortWorkList.push({
            employee,
            totalMinutes: totalWorkingMinutes,
            sessions,
          })
        }
      }
    }

    return shortWorkList
  }

  const getTodayStats = () => {
    const today = new Date().toDateString()
    const todayRecords = attendanceRecords.filter((record) => new Date(record.timestamp).toDateString() === today)

    const checkedInEmployees = new Set()
    const checkedOutEmployees = new Set()

    todayRecords.forEach((record) => {
      if (record.type === "check-in") {
        checkedInEmployees.add(record.employeeId)
      } else if (record.type === "check-out") {
        checkedOutEmployees.add(record.employeeId)
      }
    })

    const shortWorkEmployees = getShortWorkEmployees()

    return {
      totalEmployees: employees.filter((emp) => emp.status === "approved").length,
      pendingApprovals: employees.filter((emp) => emp.status === "pending").length,
      totalCheckIns: checkedInEmployees.size,
      totalCheckOuts: checkedOutEmployees.size,
      totalRecords: todayRecords.length,
      shortWorkWarnings: shortWorkEmployees.length,
    }
  }

  const exportToCSV = () => {
    try {
      const filteredRecords = getFilteredRecords()
      const csvContent = [
        ["Mã NV", "Tên nhân viên", "Loại", "Thời gian", "Địa điểm"],
        ...filteredRecords.map((record) => [
          record.employeeId,
          record.employeeName,
          record.type === "check-in" ? "Vào làm" : "Ra về",
          new Date(record.timestamp).toLocaleString("vi-VN"),
          record.location || "N/A",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `attendance_${selectedDate}.csv`
      link.click()
      
      showAlert("Xuất file CSV thành công!", "success")
    } catch (error) {
      showAlert("Lỗi khi xuất file. Vui lòng thử lại.", "error")
    }
  }

  const downloadEmployeeQR = (employee: EmployeeRegistration) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(employee.qrCode)}`
    const link = document.createElement("a")
    link.href = qrUrl
    link.download = `QR_${employee.id}_${employee.name}.png`
    link.click()
  }

  // Thêm functions cho export PDF và Excel
  const exportToPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    const filteredRecords = getFilteredRecords()

    // Header
    doc.setFontSize(16)
    doc.text("BÁO CÁO CHẤM CÔNG", 20, 20)
    doc.setFontSize(12)
    doc.text(`Ngày: ${new Date(selectedDate).toLocaleDateString("vi-VN")}`, 20, 30)
    doc.text(`Tổng số bản ghi: ${filteredRecords.length}`, 20, 40)

    // Table header
    let y = 60
    doc.setFontSize(10)
    doc.text("Mã NV", 20, y)
    doc.text("Tên nhân viên", 50, y)
    doc.text("Loại", 100, y)
    doc.text("Thời gian", 120, y)
    doc.text("Địa điểm", 160, y)

    // Table content
    filteredRecords.forEach((record, index) => {
      y += 10
      if (y > 280) {
        doc.addPage()
        y = 20
      }

      doc.text(record.employeeId, 20, y)
      doc.text(record.employeeName.substring(0, 15), 50, y)
      doc.text(record.type === "check-in" ? "Vào" : "Ra", 100, y)
      doc.text(new Date(record.timestamp).toLocaleString("vi-VN"), 120, y)
      doc.text(record.location || "N/A", 160, y)
    })

    doc.save(`attendance_${selectedDate}.pdf`)
  }

  const exportToExcel = async () => {
    try {
      const filteredRecords = getFilteredRecords()

      // Tạo data cho Excel
      const excelData = filteredRecords.map((record) => ({
        "Mã nhân viên": record.employeeId,
        "Tên nhân viên": record.employeeName,
        "Loại chấm công": record.type === "check-in" ? "Vào làm" : "Ra về",
        "Thời gian": new Date(record.timestamp).toLocaleString("vi-VN"),
        "Địa điểm": record.location || "N/A",
        Ngày: new Date(record.timestamp).toLocaleDateString("vi-VN"),
        Giờ: new Date(record.timestamp).toLocaleTimeString("vi-VN"),
      }))

      // Thêm thống kê
      const stats = getTodayStats()
      const statsData = [
        { "Thống kê": "Tổng nhân viên hoạt động", "Giá trị": stats.totalEmployees },
        { "Thống kê": "Chờ duyệt", "Giá trị": stats.pendingApprovals },
        { "Thống kê": "Đã vào làm hôm nay", "Giá trị": stats.totalCheckIns },
        { "Thống kê": "Đã ra về hôm nay", "Giá trị": stats.totalCheckOuts },
        { "Thống kê": "Tổng lượt chấm công", "Giá trị": stats.totalRecords },
      ]

      // Tạo CSV content thay vì Excel
      const csvContent = [
        // Header cho chi tiết chấm công
        ["=== CHI TIẾT CHẤM CÔNG ==="],
        ["Mã nhân viên", "Tên nhân viên", "Loại chấm công", "Thời gian", "Địa điểm", "Ngày", "Giờ"],
        ...excelData.map((row) => Object.values(row)),
        [""],
        ["=== THỐNG KÊ TỔNG QUAN ==="],
        ["Thống kê", "Giá trị"],
        ...statsData.map((row) => Object.values(row)),
      ]
        .map((row) => row.join(","))
        .join("\n")

      // Tạo và download file CSV
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `bao_cao_chi_tiet_${selectedDate}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      alert("Xuất file CSV thành công!")
    } catch (error) {
      console.error("Export error:", error)
      alert("Lỗi khi xuất file. Vui lòng thử lại.")
    }
  }

  // Thêm functions cho biểu đồ
  const getChartData = () => {
    const departmentStats = employees
      .filter((emp) => emp.status === "approved")
      .reduce(
        (acc, emp) => {
          acc[emp.department] = (acc[emp.department] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    const pieData = Object.entries(departmentStats).map(([dept, count]) => ({
      name: dept,
      value: count,
      percentage: Math.round((count / employees.filter((emp) => emp.status === "approved").length) * 100),
    }))

    // Thống kê chấm công theo giờ
    const hourlyStats = attendanceRecords
      .filter((record) => new Date(record.timestamp).toDateString() === new Date(selectedDate).toDateString())
      .reduce(
        (acc, record) => {
          const hour = new Date(record.timestamp).getHours()
          const key = `${hour}:00`
          acc[key] = (acc[key] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    const barData = Object.entries(hourlyStats)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => Number.parseInt(a.hour) - Number.parseInt(b.hour))

    return { pieData, barData }
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  const stats = getTodayStats()
  const { pieData, barData } = getChartData()

  // Thêm các hàm xử lý thông báo qua email
  const getUniqueEmployeeList = () => {
    // Lấy danh sách các phòng ban không trùng lặp (loại bỏ giá trị rỗng)
    return Array.from(
      new Set(
        employees
          .filter(e => e.status === "approved" && e.department && e.department.trim() !== "")
          .map(e => e.department)
      )
    )
  }
  
  const handleToggleEmployee = (employeeId: string, checked: boolean) => {
    setSelectedEmployees(prev => ({
      ...prev,
      [employeeId]: checked
    }))
  }

  const getSelectedEmployeesEmails = () => {
    return employees
      .filter(emp => emp.status === "approved" && selectedEmployees[emp.id])
      .map(emp => emp.email)
  }

  const handlePreviewEmail = () => {
    const firstSelectedEmployeeId = Object.entries(selectedEmployees)
      .find(([_, isSelected]) => isSelected === true)?.[0]
    
    setPreviewEmail({
      subject: emailSubject,
      content: emailContent,
      employee: employees.find(emp => emp.id === firstSelectedEmployeeId)
    })
  }

  const processEmailContent = (content: string, employee?: EmployeeRegistration) => {
    const currentDate = new Date().toLocaleDateString('vi-VN')
    let processedContent = content

    // Thay thế các placeholder chung
    processedContent = processedContent.replace(/{currentDate}/g, currentDate)
    
    // Thay thế các placeholder theo nhân viên nếu có
    if (employee) {
      processedContent = processedContent
        .replace(/{employeeName}/g, employee.name)
        .replace(/{employeeId}/g, employee.id)
        .replace(/{employeeDepartment}/g, employee.department)
        .replace(/{employeePosition}/g, employee.position)
    } else {
      // Nếu không có nhân viên cụ thể, sử dụng giá trị mẫu
      processedContent = processedContent
        .replace(/{employeeName}/g, "[Tên nhân viên]")
        .replace(/{employeeId}/g, "[Mã nhân viên]")
        .replace(/{employeeDepartment}/g, "[Phòng ban]")
        .replace(/{employeePosition}/g, "[Chức vụ]")
    }
    
    // Thay thế các placeholder khác (có thể được thay đổi sau)
    processedContent = processedContent
      .replace(/{holidayDates}/g, "01/01/2025 - 03/01/2025")
      .replace(/{holidayReason}/g, "Tết Dương lịch")
      .replace(/{holidayNotes}/g, "Quay trở lại làm việc vào ngày 04/01/2025")
      .replace(/{emergencyDate}/g, new Date().toLocaleDateString('vi-VN'))
      .replace(/{emergencyReason}/g, "Thiên tai/Lũ lụt")
      .replace(/{emergencyTime}/g, "Từ ngày " + new Date().toLocaleDateString('vi-VN'))
      .replace(/{emergencyInstructions}/g, "Làm việc tại nhà và giữ liên lạc với quản lý")
      .replace(/{terminationDate}/g, new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('vi-VN'))
      .replace(/{terminationReason}/g, "Kết thúc hợp đồng")
      .replace(/{terminationProcedures}/g, "Bàn giao công việc, thiết bị công ty và hoàn tất thủ tục thanh toán")
      .replace(/{suspensionReason}/g, suspensionReason || "[Lý do đình chỉ]")
      .replace(/{suspensionStart}/g, "[Ngày bắt đầu]")
      .replace(/{suspensionEnd}/g, "[Ngày kết thúc]")
    
    return processedContent
  }

  const handleSendEmail = async () => {
    const selectedEmployeesList = employees.filter(emp => selectedEmployees[emp.id])
    
    if (selectedEmployeesList.length === 0) {
      showAlert("Vui lòng chọn ít nhất một nhân viên để gửi thông báo!", "warning")
      return
    }
    
    if (!emailSubject || !emailContent) {
      showAlert("Vui lòng nhập đầy đủ tiêu đề và nội dung email!", "warning")
      return
    }
    
    confirm({
      title: "Gửi email thông báo",
      message: `Bạn có chắc chắn muốn gửi thông báo đến ${selectedEmployeesList.length} nhân viên?`,
      confirmLabel: "Gửi",
      type: "info",
      onConfirm: async () => {
        setIsSending(true);
        
        try {
          // Gửi riêng lẻ cho từng nhân viên (để cá nhân hóa nội dung)
          const successfulEmails = []
          
          for (const employee of selectedEmployeesList) {
            const personalizedContent = processEmailContent(emailContent, employee)
            
            const response = await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: employee.email,
                subject: emailSubject,
                html: personalizedContent
              }),
            })
            
            if (!response.ok) {
              throw new Error(`Không thể gửi email đến ${employee.email}`)
            }
            
            successfulEmails.push(employee.email)
          }
          
          // Lưu vào lịch sử email đã gửi
          const newEmailRecord: SentEmail = {
            id: Date.now().toString(),
            subject: emailSubject,
            content: emailContent,
            recipients: successfulEmails,
            sentAt: new Date().toISOString(),
            sentBy: "Admin",
            templateId: selectedEmailTemplate && typeof selectedEmailTemplate === "string" && selectedEmailTemplate !== "new" ? selectedEmailTemplate : undefined
          }
          
          const updatedEmailHistory = [...emailHistory, newEmailRecord]
          setEmailHistory(updatedEmailHistory)
          localStorage.setItem("sentEmails", JSON.stringify(updatedEmailHistory))
          
          // Hiển thị thông báo thành công
          showAlert(`Đã gửi thông báo thành công đến ${successfulEmails.length} nhân viên!`, "success")
          
          // Reset form
          setEmailSubject("")
          setEmailContent("")
          setSelectedEmailTemplate("absent")
          setSelectedEmployees({})
          setSelectAllEmployees(false)
          setPreviewEmail(null)
        } catch (error) {
          console.error('Lỗi gửi email:', error)
          showAlert(`Có lỗi xảy ra khi gửi email: ${error instanceof Error ? error.message : String(error)}`, "error")
        } finally {
          setIsSending(false)
        }
      }
    });
  }

  const handleOpenSuspendModal = (employee: EmployeeRegistration) => {
    setSuspensionEmployee(employee)
    setSuspensionReason("")
    setSuspensionDuration("1day")
  }

  const handleSuspendEmployee = async () => {
    if (!suspensionEmployee) return;

    let suspensionStartDate = new Date();
    let suspensionEndDate: Date | null = new Date();
    
    switch (suspensionDuration) {
      case "1day":
        suspensionEndDate.setDate(suspensionEndDate.getDate() + 1);
        break;
      case "3days":
        suspensionEndDate.setDate(suspensionEndDate.getDate() + 3);
        break;
      case "7days":
        suspensionEndDate.setDate(suspensionEndDate.getDate() + 7);
        break;
      case "14days":
        suspensionEndDate.setDate(suspensionEndDate.getDate() + 14);
        break;
      case "30days":
        suspensionEndDate.setDate(suspensionEndDate.getDate() + 30);
        break;
      case "permanent":
        suspensionEndDate = null; // Vĩnh viễn
        break;
    }

    const suspensionStart = suspensionStartDate.toISOString();
    const suspensionEnd = suspensionEndDate ? suspensionEndDate.toISOString() : "permanent";
    const suspensionEndString = suspensionEndDate ? suspensionEndDate.toLocaleString("vi-VN") : "Vĩnh viễn";
    
    if (!suspensionReason || !suspensionStart || !suspensionEnd) {
      showAlert("Vui lòng nhập đầy đủ thông tin đình chỉ", "warning");
      return;
    }

    confirm({
      title: "Đình chỉ tài khoản",
      message: `Bạn có chắc chắn muốn đình chỉ tài khoản của nhân viên ${suspensionEmployee.name}?`,
      confirmLabel: "Đình chỉ",
      type: "warning",
      onConfirm: async () => {
        const updatedEmployees = employees.map((emp) =>
          emp.id === suspensionEmployee.id
            ? {
                ...emp,
                status: "suspended" as const,
                suspensionReason,
                suspensionStart,
                suspensionEnd,
              }
            : emp
        );

        setEmployees(updatedEmployees);
        localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees));
        
        // Gửi email thông báo đình chỉ
        const suspensionTemplate = emailTemplates.find(t => t.id === 'suspension')
        if (suspensionTemplate) {
          let emailContent = suspensionTemplate.content
            .replace(/{employeeName}/g, suspensionEmployee.name)
            .replace(/{suspensionReason}/g, suspensionReason)
            .replace(/{suspensionStart}/g, suspensionStartDate.toLocaleString("vi-VN"))
            .replace(/{suspensionEnd}/g, suspensionEndString)

          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: suspensionEmployee.email,
                subject: suspensionTemplate.subject,
                html: emailContent,
              }),
            });
            console.log('Email đình chỉ đã được gửi đến:', suspensionEmployee.email);
          } catch (error) {
            console.error("Lỗi gửi email đình chỉ:", error);
            showAlert("Đã xảy ra lỗi khi gửi email thông báo đình chỉ", "error");
          }
        }

        setSuspensionEmployee(null);

        showAlert(`Đã đình chỉ tài khoản của nhân viên ${suspensionEmployee.name}.`, "info");
        
        // Reset form
        setSuspensionReason("");
        setSuspensionDuration("1day");
      }
    });
  };

  const handleUnsuspendEmployee = async (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    confirm({
      title: "Khôi phục tài khoản",
      message: `Bạn có chắc chắn muốn khôi phục tài khoản của nhân viên ${employee.name}?`,
      confirmLabel: "Khôi phục",
      type: "info",
      onConfirm: async () => {
        const updatedEmployees = employees.map((emp) =>
          emp.id === employeeId
            ? {
                ...emp,
                status: "approved" as const,
                suspensionReason: undefined,
                suspensionStart: undefined,
                suspensionEnd: undefined,
              }
            : emp
        );

        setEmployees(updatedEmployees);
        localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees));
        
        // Gửi email thông báo khôi phục
        const restorationTemplate = emailTemplates.find(t => t.id === 'restoration');
        if (restorationTemplate) {
          const emailContent = restorationTemplate.content.replace(/{employeeName}/g, employee.name);
          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: employee.email,
                subject: restorationTemplate.subject,
                html: emailContent,
              }),
            });
            console.log('Email khôi phục đã được gửi đến:', employee.email);
          } catch (error) {
            console.error("Lỗi gửi email khôi phục:", error);
            showAlert("Đã xảy ra lỗi khi gửi email thông báo khôi phục", "error");
          }
        }
        
        showAlert("Đã khôi phục tài khoản nhân viên.", "success");
      }
    });
  };

  // Thêm function xử lý hiển thị hình ảnh
  const handleViewFaceImage = (record: AttendanceRecord) => {
    if (record.faceImage) {
      setSelectedImage(record.faceImage)
      setSelectedAttendanceInfo({
        employeeName: record.employeeName,
        timestamp: record.timestamp,
        type: record.type
      })
      setShowImageModal(true)
    } else {
      showAlert("Không có hình ảnh xác thực cho lần chấm công này", "info")
    }
  }

  // Handle select record
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
      showAlert("Vui lòng chọn ít nhất một bản ghi để xóa", "warning");
      return;
    }
    
    confirm({
      title: `Xóa ${selectedIds.length} bản ghi chấm công`,
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} bản ghi chấm công đã chọn?`,
      confirmLabel: "Xóa",
      type: "delete",
      onConfirm: async () => {
        // Save records being deleted for undo functionality
        const recordsToDelete = attendanceRecords.filter(record => selectedIds.includes(record.id));
        setDeletedRecords(recordsToDelete);
        
        // Remove the records
        const updatedRecords = attendanceRecords.filter(record => !selectedIds.includes(record.id));
        setAttendanceRecords(updatedRecords);
        localStorage.setItem("attendanceRecords", JSON.stringify(updatedRecords));
        
        // Gửi email thông báo cho từng nhân viên bị xóa bản ghi
        const deleteTemplate = emailTemplates.find(t => t.id === 'attendanceDeleted');
        
        if (deleteTemplate) {
          // Nhóm các bản ghi theo nhân viên để gửi email một lần cho mỗi nhân viên
          const recordsByEmployee: Record<string, AttendanceRecord[]> = {};
          
          recordsToDelete.forEach(record => {
            if (!recordsByEmployee[record.employeeId]) {
              recordsByEmployee[record.employeeId] = [];
            }
            recordsByEmployee[record.employeeId].push(record);
          });
          
          // Gửi email thông báo cho từng nhân viên
          for (const [employeeId, records] of Object.entries(recordsByEmployee)) {
            const employee = employees.find(emp => emp.id === employeeId);
            
            if (employee && employee.email) {
              try {
                // Nếu có nhiều bản ghi, gửi thông tin về tất cả các bản ghi trong một email
                let recordsInfo = '';
                records.forEach(record => {
                  const attendanceDate = new Date(record.timestamp).toLocaleDateString("vi-VN");
                  const attendanceTime = new Date(record.timestamp).toLocaleTimeString("vi-VN");
                  const attendanceType = record.type === "check-in" ? "Chấm công vào" : "Chấm công ra";
                  
                  recordsInfo += `<div style="margin-bottom: 10px; padding: 5px;">
                    <p><strong>Ngày chấm công:</strong> ${attendanceDate}</p>
                    <p><strong>Thời điểm chấm công:</strong> ${attendanceTime}</p>
                    <p><strong>Loại chấm công:</strong> ${attendanceType}</p>
                  </div>`;
                });
                
                // Tạo nội dung email hoàn chỉnh với thông tin các bản ghi
                let emailContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                  <h2 style="color: #d32f2f; text-align: center;">Thông báo xóa bản ghi chấm công</h2>
                  <p>Kính gửi <strong>${employee.name}</strong>,</p>
                  <p>Chúng tôi xin thông báo rằng ${records.length > 1 ? 'các' : ''} bản ghi chấm công của bạn đã bị xóa khỏi hệ thống.</p>
                  <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p><strong>${records.length > 1 ? 'Các bản' : 'Bản'} ghi đã bị xóa:</strong></p>
                    ${recordsInfo}
                  </div>
                  <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với phòng nhân sự để biết thêm thông tin chi tiết.</p>
                  <p style="margin-top: 20px;">Trân trọng,</p>
                  <p><strong>Phòng nhân sự</strong></p>
                </div>`;
                
                await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: employee.email,
                    subject: `${records.length > 1 ? records.length + ' bản ghi' : 'Bản ghi'} chấm công của bạn đã bị xóa`,
                    html: emailContent,
                  }),
                });
                
                console.log(`Email thông báo xóa đã được gửi đến: ${employee.email} (${records.length} bản ghi)`);
              } catch (error) {
                console.error("Lỗi gửi email thông báo xóa bản ghi chấm công:", error);
              }
            }
          }
        }
        
        // Reset selection
        setSelectedRecords({});
        setSelectAllRecords(false);
        
        // Show success message with undo option
        showAlert(`Đã xóa ${selectedIds.length} bản ghi chấm công`, "success");
        setShowUndoAlert(true);
        
        // Auto-hide undo alert after 10 seconds
        setTimeout(() => {
          setShowUndoAlert(false);
        }, 10000);
      }
    });
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
    
    showAlert(`Đã khôi phục ${deletedRecords.length} bản ghi chấm công`, "success");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl">Bảng điều khiển Admin</CardTitle>
              <CardDescription>Quản lý nhân viên và chấm công</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/reports")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Báo cáo chi tiết
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.totalEmployees}</p>
                <p className="text-xs text-gray-600">Nhân viên hoạt động</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.pendingApprovals}</p>
                <p className="text-xs text-gray-600">Chờ duyệt</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.totalCheckIns}</p>
                <p className="text-xs text-gray-600">Đã vào hôm nay</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.totalCheckOuts}</p>
                <p className="text-xs text-gray-600">Đã ra hôm nay</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.totalRecords}</p>
                <p className="text-xs text-gray-600">Tổng lượt chấm</p>
              </div>
            </CardContent>
          </Card>

          {/* Thêm card cảnh báo sau các card stats hiện tại */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.shortWorkWarnings}</p>
                <p className="text-xs text-gray-600">Cảnh báo &lt; 1h</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pending-approval" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="pending-approval">
              <UserCheck className="w-4 h-4 mr-2" />
              Chờ duyệt tài khoản
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
              Quản lý nhân viên
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <BarChart3 className="w-4 h-4 mr-2" />
              Báo cáo chấm công
            </TabsTrigger>
            <TabsTrigger value="warnings">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Cảnh báo ({stats.shortWorkWarnings})
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              Xuất dữ liệu
            </TabsTrigger>
            {/* <TabsTrigger value="reports" onClick={() => router.push("/admin/reports")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Báo cáo chi tiết
            </TabsTrigger> */}
            <TabsTrigger value="notifications">
              <Mail className="w-4 h-4 mr-2" />
              Thông báo
            </TabsTrigger>
            <TabsTrigger value="notification-history">
              <FileText className="w-4 h-4 mr-2" />
              Lịch sử thông báo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending-approval">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách tài khoản chờ duyệt</CardTitle>
                <CardDescription>
                  Có {employees.filter(emp => emp.status === "pending").length} tài khoản đang chờ duyệt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees.filter(emp => emp.status === "pending").length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-500">Không có tài khoản nào đang chờ duyệt</p>
                    </div>
                  ) : (
                    employees
                      .filter(emp => emp.status === "pending")
                      .map((employee) => (
                        <div key={employee.id} className="border p-4 rounded-md flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold">
                              {employee.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold">{employee.name}</p>
                              <p className="text-sm text-gray-500">
                                {employee.id} | {employee.email}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary">Chờ duyệt</Badge>
                                {employee.department && <Badge variant="outline">{employee.department}</Badge>}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Đăng ký: {new Date(employee.registeredAt).toLocaleString("vi-VN")}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveEmployee(employee.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Duyệt
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectEmployee(employee.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Từ chối
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách nhân viên</CardTitle>
                <CardDescription>
                  Tổng cộng: {employees.length} nhân viên. Đang hoạt động:{" "}
                  {employees.filter((emp) => emp.status === "approved").length}.
                </CardDescription>
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm nhân viên theo tên, mã, email..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Lọc theo trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="pending">Chờ duyệt</SelectItem>
                        <SelectItem value="approved">Hoạt động</SelectItem>
                        <SelectItem value="suspended">Bị đình chỉ</SelectItem>
                        <SelectItem value="rejected">Bị từ chối</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees
                    .filter(
                      (emp) =>
                        (statusFilter === "all" || emp.status === statusFilter) &&
                        (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email.toLowerCase().includes(searchTerm.toLowerCase())),
                    )
                    .map((employee) => (
                      <div key={employee.id} className="border p-4 rounded-md flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                              employee.status === "approved"
                                ? "bg-green-500"
                                : employee.status === "pending"
                                ? "bg-yellow-500"
                                : employee.status === "suspended"
                                ? "bg-red-700"
                                : "bg-red-500"
                            }`}
                          >
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold">{employee.name}</p>
                            <p className="text-sm text-gray-500">
                              {employee.id} | {employee.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  employee.status === "approved"
                                    ? "default"
                                    : employee.status === "pending"
                                    ? "secondary"
                                    : employee.status === "suspended"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {employee.status === "approved"
                                  ? "Đã duyệt"
                                  : employee.status === "pending"
                                  ? "Chờ duyệt"
                                  : employee.status === "suspended"
                                  ? "Bị đình chỉ"
                                  : "Bị từ chối"}
                              </Badge>
                              {employee.department && <Badge variant="outline">{employee.department}</Badge>}
                            </div>
                            <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-2 w-fit">Mã: {employee.uniqueCode}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {employee.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveEmployee(employee.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Duyệt
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRejectEmployee(employee.id)}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Từ chối
                              </Button>
                            </>
                          )}
                          {employee.status === "approved" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSuspendModal(employee)}
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Đình chỉ
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadEmployeeQR(employee)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Tải QR
                              </Button>
                            </>
                          )}
                          {employee.status === "suspended" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnsuspendEmployee(employee.id)}
                            >
                              <UserCheck2 className="w-4 h-4 mr-2" />
                              Khôi phục
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEmployee(employee)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Lịch sử chấm công</CardTitle>
                    <CardDescription>Xem và quản lý dữ liệu chấm công của nhân viên</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-auto"
                    />
                    <div className="flex gap-1">
                      <Button variant="outline" onClick={exportToPDF} size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" onClick={exportToExcel} size="sm">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                      <Button variant="outline" onClick={exportToCSV} size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="relative w-full max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="search"
                        placeholder="Tìm theo tên, mã nhân viên..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox 
                              checked={selectAllRecords} 
                              onCheckedChange={handleSelectAllRecords}
                              aria-label="Chọn tất cả" 
                            />
                          </TableHead>
                          <TableHead className="w-[100px]">Mã NV</TableHead>
                          <TableHead>Tên nhân viên</TableHead>
                          <TableHead className="w-[80px] text-center">Loại</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead className="hidden md:table-cell">Địa điểm</TableHead>
                          <TableHead className="w-[140px] text-right">Tác vụ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredRecords().length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              Không có dữ liệu chấm công nào cho ngày đã chọn
                            </TableCell>
                          </TableRow>
                        ) : (
                          getFilteredRecords()
                            .sort(
                              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                            )
                            .map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={!!selectedRecords[record.id]} 
                                    onCheckedChange={(checked) => handleSelectRecord(record.id, !!checked)}
                                    aria-label={`Chọn bản ghi của ${record.employeeName}`} 
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-sm">{record.employeeId}</TableCell>
                                <TableCell>{record.employeeName}</TableCell>
                                <TableCell className="text-center">
                                  {record.type === "check-in" ? (
                                    <Badge variant="default">Vào</Badge>
                                  ) : (
                                    <Badge variant="secondary">Ra</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{new Date(record.timestamp).toLocaleString("vi-VN")}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {record.location || "N/A"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={!record.faceImage}
                                      title={record.faceImage ? "Xem ảnh xác thực" : "Không có ảnh"}
                                      onClick={() => handleViewFaceImage(record)}
                                    >
                                      <UserRound className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        confirm({
                                          title: "Xóa bản ghi chấm công",
                                          message: `Bạn có chắc chắn muốn xóa bản ghi chấm công này của nhân viên ${record.employeeName}?`,
                                          confirmLabel: "Xóa",
                                          type: "delete",
                                          onConfirm: async () => {
                                            const updatedRecords = attendanceRecords.filter(
                                              (r) => r.id !== record.id,
                                            )
                                            setAttendanceRecords(updatedRecords)
                                            localStorage.setItem(
                                              "attendanceRecords",
                                              JSON.stringify(updatedRecords),
                                            )
                                            
                                            // Tìm thông tin nhân viên
                                            const employee = employees.find(emp => emp.id === record.employeeId);
                                            
                                            // Gửi email thông báo xóa bản ghi chấm công
                                            if (employee && employee.email) {
                                              const deleteTemplate = emailTemplates.find(t => t.id === 'attendanceDeleted')
                                              if (deleteTemplate) {
                                                const attendanceDate = new Date(record.timestamp).toLocaleDateString("vi-VN")
                                                const attendanceTime = new Date(record.timestamp).toLocaleTimeString("vi-VN")
                                                const attendanceType = record.type === "check-in" ? "Chấm công vào" : "Chấm công ra"
                                                
                                                let emailContent = deleteTemplate.content
                                                  .replace(/{employeeName}/g, employee.name)
                                                  .replace(/{attendanceDate}/g, attendanceDate)
                                                  .replace(/{attendanceTime}/g, attendanceTime)
                                                  .replace(/{attendanceType}/g, attendanceType)
                                                
                                                try {
                                                  await fetch('/api/send-email', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                      to: employee.email,
                                                      subject: deleteTemplate.subject,
                                                      html: emailContent,
                                                    }),
                                                  });
                                                  console.log('Email thông báo xóa bản ghi chấm công đã được gửi đến:', employee.email);
                                                } catch (error) {
                                                  console.error("Lỗi gửi email thông báo xóa bản ghi chấm công:", error);
                                                }
                                              }
                                            }
                                            
                                            showAlert("Đã xóa bản ghi chấm công", "success")
                                          }
                                        });
                                      }}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Batch Actions */}
                  <div className="flex justify-between items-center mt-4">
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

          <TabsContent value="warnings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Cảnh báo làm việc dưới 1 tiếng
                </CardTitle>
                <CardDescription>Danh sách nhân viên làm việc dưới 1 tiếng trong ngày hôm nay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getShortWorkEmployees().length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-500">Không có cảnh báo nào hôm nay</p>
                    </div>
                  ) : (
                    getShortWorkEmployees().map((item, index) => (
                      <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-yellow-800">{item.employee.name}</h3>
                            <p className="text-sm text-yellow-700">
                              {item.employee.id} - {item.employee.department}
                            </p>
                          </div>
                          <Badge variant="destructive">
                            {Math.floor(item.totalMinutes / 60)}h {item.totalMinutes % 60}m
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-yellow-800">Chi tiết ca làm việc:</p>
                          {item.sessions.map((session: any, sessionIndex: number) => (
                            <div
                              key={sessionIndex}
                              className="flex justify-between items-center p-2 bg-white rounded text-sm"
                            >
                              <div className="flex gap-4">
                                <span>Vào: {new Date(session.checkIn).toLocaleTimeString("vi-VN")}</span>
                                <span>Ra: {new Date(session.checkOut).toLocaleTimeString("vi-VN")}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {session.duration.hours}h {session.duration.minutes}m {session.duration.seconds}s
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Xuất báo cáo</CardTitle>
                <CardDescription>Xuất dữ liệu chấm công theo ngày</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="exportDate">Chọn ngày xuất báo cáo</Label>
                    <Input
                      id="exportDate"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <Button onClick={exportToCSV} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Xuất file CSV
                  </Button>
                  <Button onClick={exportToPDF} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Xuất file PDF
                  </Button>
                  <Button onClick={exportToExcel} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Xuất file Excel
                  </Button>
                  <p className="text-sm text-gray-500">Tổng cộng: {getFilteredRecords().length} bản ghi</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notification-history">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Lịch sử thông báo đã gửi</CardTitle>
                <CardDescription>
                  Xem lại các thông báo đã gửi qua email cho nhân viên
                </CardDescription>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emailSearch" className="text-sm font-medium">Tìm kiếm theo email người nhận</Label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="emailSearch"
                          placeholder="Nhập email người nhận..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="subjectSearch" className="text-sm font-medium">Tìm kiếm theo tiêu đề</Label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="subjectSearch"
                          placeholder="Nhập tiêu đề thông báo..."
                          className="pl-10"
                          value={subjectSearchTerm}
                          onChange={(e) => setSubjectSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate" className="text-sm font-medium">Từ ngày</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-sm font-medium">Đến ngày</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {emailHistory.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Chưa có thông báo nào được gửi</p>
                  ) : (
                    <div className="space-y-4">
                      {emailHistory
                        .filter(email => {
                          // Apply all filters
                          
                          // Filter by recipient email if searchTerm is not empty
                          const matchesEmail = !searchTerm || email.recipients.some(recipient => 
                            recipient.toLowerCase().includes(searchTerm.toLowerCase())
                          );
                          
                          // Filter by subject if subjectSearchTerm is not empty
                          const matchesSubject = !subjectSearchTerm || 
                            email.subject.toLowerCase().includes(subjectSearchTerm.toLowerCase());
                          
                          // Filter by date range if date filters are set
                          let matchesDateRange = true;
                          const emailDate = new Date(email.sentAt).setHours(0, 0, 0, 0);
                          
                          if (startDateFilter) {
                            const startDate = new Date(startDateFilter).setHours(0, 0, 0, 0);
                            matchesDateRange = matchesDateRange && emailDate >= startDate;
                          }
                          
                          if (endDateFilter) {
                            const endDate = new Date(endDateFilter).setHours(23, 59, 59, 999);
                            matchesDateRange = matchesDateRange && emailDate <= endDate;
                          }
                          
                          return matchesEmail && matchesSubject && matchesDateRange;
                        })
                        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                        .map((email) => (
                          <div key={email.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium">{email.subject}</h3>
                                <p className="text-sm text-gray-600">
                                  Gửi vào: {new Date(email.sentAt).toLocaleString("vi-VN")}
                                </p>
                                <div className="mt-1">
                                  <Badge variant="secondary">
                                    {email.recipients.length} người nhận
                                  </Badge>
                                  {email.templateId && (
                                    <Badge variant="outline" className="ml-2">
                                      {emailTemplates.find(t => t.id === email.templateId)?.name || "Mẫu email"}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Create a modal-style preview in the current tab
                                  const previewModal = document.createElement('div');
                                  previewModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
                                  
                                  const modalContent = document.createElement('div');
                                  modalContent.className = 'bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto';
                                  
                                  const modalHeader = document.createElement('div');
                                  modalHeader.className = 'flex justify-between items-center mb-4';
                                  
                                  const modalTitle = document.createElement('h3');
                                  modalTitle.className = 'text-xl font-bold';
                                  modalTitle.textContent = email.subject;
                                  
                                  const closeButton = document.createElement('button');
                                  closeButton.className = 'text-gray-500 hover:text-gray-700';
                                  closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                                  closeButton.onclick = () => document.body.removeChild(previewModal);
                                  
                                  modalHeader.appendChild(modalTitle);
                                  modalHeader.appendChild(closeButton);
                                  
                                  const modalBody = document.createElement('div');
                                  modalBody.className = 'mt-4';
                                  
                                  // Thêm dropdown chọn nhân viên để hiển thị nội dung cá nhân hóa
                                  const employeeSelectSection = document.createElement('div');
                                  employeeSelectSection.className = 'mb-4';
                                  employeeSelectSection.innerHTML = `
                                    <label class="font-medium mb-2 block">Xem với dữ liệu của nhân viên:</label>
                                    <select id="employeePreviewSelect" class="w-full p-2 border rounded-md">
                                      <option value="">Hiển thị mẫu chung</option>
                                      ${email.recipients.map(recipientEmail => {
                                        const emp = employees.find(e => e.email === recipientEmail);
                                        return emp ? 
                                          `<option value="${emp.id}">${emp.name} (${emp.email})</option>` : 
                                          `<option value="">${recipientEmail}</option>`;
                                      }).join('')}
                                    </select>
                                  `;
                                  
                                  const recipientsSection = document.createElement('div');
                                  recipientsSection.className = 'mb-4';
                                  recipientsSection.innerHTML = `
                                    <p class="font-semibold">Người nhận:</p>
                                    <div class="flex flex-wrap gap-1 mt-2">
                                      ${email.recipients.map(r => `<span class="inline-block bg-gray-100 rounded px-2 py-1">${r}</span>`).join('')}
                                    </div>
                                  `;
                                  
                                  const infoSection = document.createElement('div');
                                  infoSection.className = 'mb-4 text-sm text-gray-600';
                                  infoSection.innerHTML = `
                                    <p>Gửi vào: ${new Date(email.sentAt).toLocaleString("vi-VN")}</p>
                                  `;
                                  
                                  const contentSection = document.createElement('div');
                                  contentSection.className = 'border-t pt-4 mt-4';
                                  contentSection.innerHTML = `
                                    <div class="flex justify-between items-center mb-2">
                                      <p class="font-semibold">Nội dung email:</p>
                                      <span id="previewEmployeeInfo" class="text-sm text-blue-600 font-medium"></span>
                                    </div>
                                    <div id="emailContentPreview" class="p-4 border rounded-lg bg-white">
                                      ${processEmailContent(email.content)}
                                    </div>
                                  `;
                                  
                                  modalBody.appendChild(employeeSelectSection);
                                  modalBody.appendChild(recipientsSection);
                                  modalBody.appendChild(infoSection);
                                  modalBody.appendChild(contentSection);
                                  
                                  modalContent.appendChild(modalHeader);
                                  modalContent.appendChild(modalBody);
                                  previewModal.appendChild(modalContent);
                                  
                                  document.body.appendChild(previewModal);
                                  
                                  // Thêm sự kiện cho dropdown chọn nhân viên
                                  setTimeout(() => {
                                    const employeeSelect = document.getElementById('employeePreviewSelect') as HTMLSelectElement;
                                    const previewEmployeeInfo = document.getElementById('previewEmployeeInfo');
                                    const emailContentPreview = document.getElementById('emailContentPreview');
                                    
                                    if (employeeSelect && emailContentPreview) {
                                      employeeSelect.addEventListener('change', () => {
                                        const selectedEmployeeId = employeeSelect.value;
                                        let selectedEmployee: EmployeeRegistration | undefined;
                                        let displayText = '';
                                        
                                        if (selectedEmployeeId) {
                                          selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
                                          if (selectedEmployee) {
                                            displayText = `Đang xem với dữ liệu của: ${selectedEmployee.name}`;
                                          }
                                        } else {
                                          displayText = 'Đang xem mẫu chung';
                                        }
                                        
                                        if (previewEmployeeInfo) {
                                          previewEmployeeInfo.textContent = displayText;
                                        }
                                        
                                        if (emailContentPreview) {
                                          emailContentPreview.innerHTML = processEmailContent(
                                            email.content, 
                                            selectedEmployee
                                          );
                                        }
                                      });
                                    }
                                  }, 100);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Xem lại
                              </Button>
                            </div>
                            
                            <div className="mt-2 text-sm">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold">Người nhận:</p>
                                <div className="relative w-48">
                                  <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
                                  <Input
                                    placeholder="Tìm email..."
                                    className="h-7 pl-7 py-1 text-xs"
                                    value={emailCardSearchTerms[email.id] || ''}
                                    onChange={(e) => {
                                      setEmailCardSearchTerms(prev => ({
                                        ...prev,
                                        [email.id]: e.target.value
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="max-h-[100px] overflow-y-auto">
                                {email.recipients
                                  .filter(recipient => {
                                    const cardSearchTerm = emailCardSearchTerms[email.id] || '';
                                    return !cardSearchTerm || recipient.toLowerCase().includes(cardSearchTerm.toLowerCase());
                                  })
                                  .map((recipient, i) => (
                                    <span 
                                      key={i} 
                                      className={`inline-block rounded px-2 py-1 mr-2 mb-2 ${
                                        ((searchTerm && recipient.toLowerCase().includes(searchTerm.toLowerCase())) || 
                                        (emailCardSearchTerms[email.id] && recipient.toLowerCase().includes(emailCardSearchTerms[email.id].toLowerCase())))
                                          ? 'bg-blue-100 border-blue-300 border' 
                                          : 'bg-gray-100'
                                      }`}
                                    >
                                      {recipient}
                                    </span>
                                  ))
                                }
                                {email.recipients.length > 0 && 
                                  emailCardSearchTerms[email.id] && 
                                  !email.recipients.some(r => r.toLowerCase().includes(emailCardSearchTerms[email.id].toLowerCase())) && (
                                    <p className="text-gray-500 italic">Không tìm thấy email phù hợp</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-2 text-sm">
                              <p className="font-semibold mb-1">Nội dung:</p>
                              <div 
                                className="bg-gray-50 p-3 rounded max-h-[150px] overflow-y-auto"
                                dangerouslySetInnerHTML={{ 
                                  __html: email.content.length > 200 
                                    ? email.content.substring(0, 200) + "..." 
                                    : email.content
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Gửi thông báo đến nhân viên</CardTitle>
                <CardDescription>
                  Soạn và gửi thông báo qua email đến nhân viên theo cá nhân, nhóm hoặc toàn công ty
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Chọn người nhận */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Chọn người nhận</h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="selectAll" 
                          checked={selectAllEmployees}
                          onCheckedChange={(checked) => {
                            setSelectAllEmployees(!!checked)
                            setSelectedDepartments([])
                          }}
                        />
                        <Label htmlFor="selectAll">Chọn tất cả nhân viên</Label>
                      </div>
                      
                      <div>
                        <Label htmlFor="departmentSelect">Hoặc chọn theo phòng ban</Label>
                        <div className="border rounded-md p-2 mt-1 max-h-[150px] overflow-auto">
                          {getUniqueEmployeeList().map((dept) => (
                            <div key={dept} className="flex items-center gap-2 py-1">
                              <Checkbox 
                                id={`dept-${dept}`} 
                                checked={selectedDepartments.includes(dept)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDepartments(prev => [...prev, dept]);
                                  } else {
                                    setSelectedDepartments(prev => prev.filter(d => d !== dept));
                                  }
                                  setSelectAllEmployees(false);
                                }}
                              />
                              <Label htmlFor={`dept-${dept}`}>{dept}</Label>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          Đã chọn {selectedDepartments.length}/{getUniqueEmployeeList().length} phòng ban
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Danh sách nhân viên với checkbox */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Danh sách nhân viên</h3>
                    <div className="border rounded-md p-1 max-h-[250px] overflow-auto">
                      {employees
                        .filter(emp => emp.status === "approved")
                        .sort((a, b): number => {
                          // Check if employees belong to selected departments
                          const aInSelectedDept = selectedDepartments.includes(a.department);
                          const bInSelectedDept = selectedDepartments.includes(b.department);
                          
                          // First sort by whether they're in selected departments
                          if (aInSelectedDept && !bInSelectedDept) return -1;
                          if (!aInSelectedDept && bInSelectedDept) return 1;
                          
                          // Then sort alphabetically by name within each group
                          return a.name.localeCompare(b.name);
                        })
                        .map(employee => (
                          <div 
                            key={employee.id} 
                            className={`flex items-center gap-3 p-2 hover:bg-slate-50 rounded-sm ${
                              selectedDepartments.includes(employee.department) ? "bg-slate-50" : ""
                            }`}
                          >
                            <Checkbox 
                              id={`emp-${employee.id}`} 
                              checked={!!selectedEmployees[employee.id]}
                              onCheckedChange={(checked) => handleToggleEmployee(employee.id, !!checked)}
                            />
                            <div className="grid gap-0.5">
                              <Label htmlFor={`emp-${employee.id}`} className="font-medium">
                                {employee.name}
                              </Label>
                              <p className="text-sm text-gray-500">
                                {employee.email} • {employee.department || "Chưa phân phòng ban"}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Đã chọn {Object.values(selectedEmployees).filter(Boolean).length}/{employees.filter(e => e.status === "approved").length} nhân viên
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Soạn nội dung email */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Nội dung thông báo</h3>
                    
                    <div>
                      <Label htmlFor="emailTemplate">Mẫu thông báo</Label>
                      <Select 
                        value={selectedEmailTemplate} 
                        onValueChange={(value: string) => setSelectedEmailTemplate(value)}
                      >
                        <SelectTrigger id="emailTemplate" className="w-full mt-1">
                          <SelectValue placeholder="Chọn mẫu thông báo hoặc tạo mới" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Tạo thông báo mới</SelectItem>
                          {emailTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="emailSubject">Tiêu đề email</Label>
                      <Input 
                        id="emailSubject" 
                        value={emailSubject} 
                        onChange={(e) => setEmailSubject(e.target.value)} 
                        placeholder="Nhập tiêu đề email"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="emailContent">Nội dung email (hỗ trợ HTML)</Label>
                      <Textarea 
                        id="emailContent" 
                        value={emailContent} 
                        onChange={(e) => setEmailContent(e.target.value)}
                        placeholder="Nhập nội dung email (hỗ trợ HTML)"
                        className="min-h-[200px] font-mono text-sm mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Bạn có thể sử dụng các biến như {"{employeeName}"}, {"{employeeId}"}, {"{currentDate}"}, ...
                      </p>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handlePreviewEmail}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {previewEmail ? "Ẩn xem trước" : "Xem trước"}
                      </Button>
                      
                      <Button 
                        type="button"
                        onClick={handleSendEmail}
                        disabled={isSending}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSending ? "Đang gửi..." : "Gửi thông báo"}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Preview email */}
                  {previewEmail && (
                    <div className="border rounded-md p-4 mt-4">
                      <h3 className="text-lg font-medium mb-2">Xem trước email</h3>
                      <div className="border-t border-b py-2 mb-2">
                        <p><strong>Tiêu đề:</strong> {emailSubject}</p>
                        <p><strong>Người nhận:</strong> {getSelectedEmployeesEmails().join(", ")}</p>
                      </div>
                      <div 
                        className="bg-white rounded p-4 max-h-[400px] overflow-auto" 
                        dangerouslySetInnerHTML={{ 
                          __html: processEmailContent(emailContent) 
                        }} 
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Preview Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Mã QR - {selectedEmployee.name}</CardTitle>
                <CardDescription>Mã QR chấm công cá nhân</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedEmployee.qrCode)}`}
                    alt="QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => downloadEmployeeQR(selectedEmployee)} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Tải xuống
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedEmployee(null)} className="flex-1">
                    Đóng
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Suspend Employee Modal */}
        {suspensionEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Đình chỉ tài khoản: {suspensionEmployee.name}</CardTitle>
                <CardDescription>
                  Tài khoản sẽ không thể chấm công trong thời gian bị đình chỉ.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="suspensionReason">Lý do đình chỉ</Label>
                  <Textarea
                    id="suspensionReason"
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="VD: Vi phạm nội quy công ty..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="suspensionDuration">Thời hạn đình chỉ</Label>
                  <Select 
                    value={suspensionDuration} 
                    onValueChange={(value: "1day" | "3days" | "7days" | "14days" | "30days" | "permanent") => setSuspensionDuration(value)}
                  >
                    <SelectTrigger id="suspensionDuration" className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1day">1 ngày</SelectItem>
                      <SelectItem value="3days">3 ngày</SelectItem>
                      <SelectItem value="7days">7 ngày</SelectItem>
                      <SelectItem value="14days">14 ngày</SelectItem>
                      <SelectItem value="30days">30 ngày</SelectItem>
                      <SelectItem value="permanent">Vĩnh viễn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSuspensionEmployee(null)}>
                    Hủy
                  </Button>
                  <Button onClick={handleSuspendEmployee}>Xác nhận đình chỉ</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal xem ảnh xác thực khuôn mặt */}
        {showImageModal && selectedImage && selectedAttendanceInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Ảnh xác thực khuôn mặt</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowImageModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  {selectedAttendanceInfo.employeeName} - {selectedAttendanceInfo.type === "check-in" ? "Vào ca" : "Ra ca"} lúc {new Date(selectedAttendanceInfo.timestamp).toLocaleString("vi-VN")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={selectedImage} 
                    alt="Face verification" 
                    className="w-full h-auto"
                  />
                </div>
              </CardContent>
              <div className="p-4 border-t flex justify-end">
                <Button variant="secondary" onClick={() => setShowImageModal(false)}>
                  Đóng
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
