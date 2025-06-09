"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
  UserX,
  UserCheck2,
} from "lucide-react"
import { emailTemplates } from "@/lib/emailTemplates"

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
  sentBy: string
  templateId?: string
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
  const [employees, setEmployees] = useState<EmployeeRegistration[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRegistration | null>(null)
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailContent, setEmailContent] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, boolean>>({})
  const [selectAllEmployees, setSelectAllEmployees] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([])
  const [subjectSearchTerm, setSubjectSearchTerm] = useState("")
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  const [emailCardSearchTerms, setEmailCardSearchTerms] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedEmployeeForSuspension, setSelectedEmployeeForSuspension] = useState<EmployeeRegistration | null>(null)
  const [suspensionReason, setSuspensionReason] = useState("")
  const [suspensionDuration, setSuspensionDuration] = useState<string>("12h")
  const [customSuspensionStart, setCustomSuspensionStart] = useState("")
  const [customSuspensionEnd, setCustomSuspensionEnd] = useState("")
  const router = useRouter()

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin")
    if (!isAdmin) {
      router.push("/admin/login")
      return
    }

    loadData()
  }, [router])

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
    if (selectedDepartment) {
      const deptEmployees = employees
        .filter(emp => emp.status === 'approved' && emp.department === selectedDepartment)
        .reduce((acc, emp) => {
          acc[emp.id] = true
          return acc
        }, {} as Record<string, boolean>)
      
      setSelectedEmployees(deptEmployees)
    }
  }, [selectedDepartment, employees])

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
    setSentEmails(emailHistory)
  }

  const handleApproveEmployee = (employeeId: string) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId ? { ...emp, status: "approved" as const } : emp,
    )
    setEmployees(updatedEmployees)
    localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))
    alert("Đã duyệt nhân viên thành công!")
  }

  const handleRejectEmployee = (employeeId: string) => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId ? { ...emp, status: "rejected" as const } : emp,
    )
    setEmployees(updatedEmployees)
    localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))
    alert("Đã từ chối nhân viên!")
  }

  const handleDeleteEmployee = (employeeId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
      const updatedEmployees = employees.filter((emp) => emp.id !== employeeId)
      setEmployees(updatedEmployees)
      localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))

      // Xóa luôn các bản ghi chấm công
      const updatedRecords = attendanceRecords.filter((record) => record.employeeId !== employeeId)
      setAttendanceRecords(updatedRecords)
      localStorage.setItem("attendanceRecords", JSON.stringify(updatedRecords))

      alert("Đã xóa nhân viên và dữ liệu chấm công!")
    }
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
    setShowPreview(!showPreview)
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
      .replace(/{suspensionStart}/g, customSuspensionStart ? new Date(customSuspensionStart).toLocaleString('vi-VN') : "[Ngày bắt đầu]")
      .replace(/{suspensionEnd}/g, customSuspensionEnd ? new Date(customSuspensionEnd).toLocaleString('vi-VN') : "[Ngày kết thúc]")
    
    return processedContent
  }

  const handleSendEmail = async () => {
    const recipientEmails = getSelectedEmployeesEmails()
    
    if (recipientEmails.length === 0) {
      alert("Vui lòng chọn ít nhất một nhân viên để gửi thông báo!")
      return
    }
    
    if (!emailSubject || !emailContent) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung email!")
      return
    }

    setSendingEmails(true)
    
    try {
      // Nếu gửi riêng lẻ cho từng nhân viên (để cá nhân hóa nội dung)
      const selectedEmployeesList = employees.filter(emp => selectedEmployees[emp.id])
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
        templateId: selectedEmailTemplate && selectedEmailTemplate !== "new" ? selectedEmailTemplate : undefined
      }
      
      const updatedSentEmails = [...sentEmails, newEmailRecord]
      setSentEmails(updatedSentEmails)
      localStorage.setItem("sentEmails", JSON.stringify(updatedSentEmails))
      
      alert(`Đã gửi thông báo thành công đến ${selectedEmployeesList.length} nhân viên!`)
      
      // Reset form
      setEmailSubject("")
      setEmailContent("")
      setSelectedEmailTemplate(null)
      setSelectedEmployees({})
      setSelectAllEmployees(false)
      setShowPreview(false)
    } catch (error) {
      console.error('Lỗi gửi email:', error)
      alert(`Có lỗi xảy ra khi gửi email: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSendingEmails(false)
    }
  }

  const handleOpenSuspendModal = (employee: EmployeeRegistration) => {
    setSelectedEmployeeForSuspension(employee)
    setSuspensionReason("")
    setSuspensionDuration("12h")
    setCustomSuspensionStart("")
    setCustomSuspensionEnd("")
  }

  const handleSuspendEmployee = async () => {
    if (!selectedEmployeeForSuspension) return

    let suspensionStart = new Date()
    let suspensionEnd: Date | null = new Date()
    let suspensionEndString = ""

    switch (suspensionDuration) {
      case "12h":
        suspensionEnd.setHours(suspensionEnd.getHours() + 12)
        break
      case "24h":
        suspensionEnd.setHours(suspensionEnd.getHours() + 24)
        break
      case "3d":
        suspensionEnd.setDate(suspensionEnd.getDate() + 3)
        break
      case "1w":
        suspensionEnd.setDate(suspensionEnd.getDate() + 7)
        break
      case "permanent":
        suspensionEnd = null // Vĩnh viễn
        break
      case "custom":
        if (customSuspensionStart && customSuspensionEnd) {
          suspensionStart = new Date(customSuspensionStart)
          suspensionEnd = new Date(customSuspensionEnd)
        } else {
          alert("Vui lòng chọn ngày bắt đầu và kết thúc cho tùy chọn tùy chỉnh.")
          return
        }
        break
      default:
        return
    }

    suspensionEndString = suspensionEnd ? suspensionEnd.toLocaleString("vi-VN") : "Vĩnh viễn"

    const updatedEmployees = employees.map((emp) =>
      emp.id === selectedEmployeeForSuspension.id
        ? {
            ...emp,
            status: "suspended" as const,
            suspensionReason: suspensionReason,
            suspensionStart: suspensionStart.toISOString(),
            suspensionEnd: suspensionEnd ? suspensionEnd.toISOString() : "permanent",
          }
        : emp,
    )
    setEmployees(updatedEmployees)
    localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))

    // Gửi email
    const suspensionTemplate = emailTemplates.find(t => t.id === 'suspension')
    if (suspensionTemplate) {
      let emailContent = suspensionTemplate.content
        .replace(/{employeeName}/g, selectedEmployeeForSuspension.name)
        .replace(/{suspensionReason}/g, suspensionReason)
        .replace(/{suspensionStart}/g, suspensionStart.toLocaleString("vi-VN"))
        .replace(/{suspensionEnd}/g, suspensionEndString)

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedEmployeeForSuspension.email,
            subject: suspensionTemplate.subject,
            html: emailContent,
          }),
        })
      } catch (error) {
        console.error("Lỗi gửi email đình chỉ:", error)
        // Không chặn luồng nếu gửi mail lỗi, nhưng có thể log lại
      }
    }

    alert(`Đã đình chỉ tài khoản của nhân viên ${selectedEmployeeForSuspension.name}.`)
    setSelectedEmployeeForSuspension(null)
  }

  const handleUnsuspendEmployee = async (employeeId: string) => {
    const employeeToRestore = employees.find(emp => emp.id === employeeId)
    if (!employeeToRestore) return

    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? {
            ...emp,
            status: "approved" as const,
            suspensionReason: undefined,
            suspensionStart: undefined,
            suspensionEnd: undefined,
          }
        : emp,
    )
    setEmployees(updatedEmployees)
    localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))

    // Gửi email thông báo khôi phục
    const restorationTemplate = emailTemplates.find(t => t.id === 'restoration')
    if (restorationTemplate) {
      const emailContent = restorationTemplate.content.replace(/{employeeName}/g, employeeToRestore.name)
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: employeeToRestore.email,
            subject: restorationTemplate.subject,
            html: emailContent,
          }),
        })
      } catch (error) {
        console.error("Lỗi gửi email khôi phục:", error)
      }
    }

    alert("Đã khôi phục tài khoản nhân viên.")
  }

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
        <Tabs defaultValue="approvals" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="approvals">
              <UserCheck className="w-4 h-4 mr-2" />
              Duyệt nhân viên ({stats.pendingApprovals})
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
            <TabsTrigger value="reports" onClick={() => router.push("/admin/reports")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Báo cáo chi tiết
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Mail className="w-4 h-4 mr-2" />
              Thông báo
            </TabsTrigger>
            <TabsTrigger value="notification-history">
              <FileText className="w-4 h-4 mr-2" />
              Lịch sử thông báo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Đăng ký nhân viên</CardTitle>
                <CardDescription>Xem xét và phê duyệt các đăng ký mới</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees.filter((emp) => emp.status === "pending").length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Không có đăng ký nào chờ duyệt</p>
                  ) : (
                    employees
                      .filter((emp) => emp.status === "pending")
                      .map((employee) => (
                        <div key={employee.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-medium">{employee.name}</h3>
                              <p className="text-sm text-gray-600">Mã NV: {employee.id}</p>
                              <p className="text-sm text-gray-600">Email: {employee.email}</p>
                              <p className="text-sm text-gray-600">
                                {employee.department} - {employee.position}
                              </p>
                              <p className="text-xs text-gray-500">
                                Đăng ký: {new Date(employee.registeredAt).toLocaleString("vi-VN")}
                              </p>
                            </div>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Chờ duyệt
                            </Badge>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveEmployee(employee.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Duyệt
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectEmployee(employee.id)}>
                              <XCircle className="w-4 h-4 mr-1" />
                              Từ chối
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedEmployee(employee)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Xem QR
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
                <CardTitle>Báo cáo chấm công</CardTitle>
                <div className="flex gap-4 mt-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Tìm kiếm</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Tên hoặc mã nhân viên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="date">Chọn ngày</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getFilteredRecords().length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Không có dữ liệu</p>
                  ) : (
                    getFilteredRecords().map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge variant={record.type === "check-in" ? "default" : "secondary"}>
                            {record.type === "check-in" ? "Vào" : "Ra"}
                          </Badge>
                          <div>
                            <p className="font-medium">{record.employeeName}</p>
                            <p className="text-sm text-gray-500">
                              {record.employeeId} - {new Date(record.timestamp).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
                  {sentEmails.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Chưa có thông báo nào được gửi</p>
                  ) : (
                    <div className="space-y-4">
                      {sentEmails
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
                                    <p class="font-semibold mb-2">Nội dung email:</p>
                                    <div class="p-4 border rounded-lg bg-white">
                                      ${email.content}
                                    </div>
                                  `;
                                  
                                  modalBody.appendChild(recipientsSection);
                                  modalBody.appendChild(infoSection);
                                  modalBody.appendChild(contentSection);
                                  
                                  modalContent.appendChild(modalHeader);
                                  modalContent.appendChild(modalBody);
                                  previewModal.appendChild(modalContent);
                                  
                                  document.body.appendChild(previewModal);
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
                            setSelectedDepartment(null)
                          }}
                        />
                        <Label htmlFor="selectAll">Chọn tất cả nhân viên</Label>
                      </div>
                      
                      <div>
                        <Label htmlFor="departmentSelect">Hoặc chọn theo phòng ban</Label>
                        <Select 
                          value={selectedDepartment || ""} 
                          onValueChange={(value) => {
                            setSelectedDepartment(value || null)
                            setSelectAllEmployees(false)
                          }}
                        >
                          <SelectTrigger id="departmentSelect" className="w-full mt-1">
                            <SelectValue placeholder="Chọn phòng ban" />
                          </SelectTrigger>
                          <SelectContent>
                            {getUniqueEmployeeList().map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        .map(employee => (
                          <div 
                            key={employee.id} 
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-sm"
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
                        value={selectedEmailTemplate || "new"} 
                        onValueChange={(value) => setSelectedEmailTemplate(value)}
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
                        {showPreview ? "Ẩn xem trước" : "Xem trước"}
                      </Button>
                      
                      <Button 
                        type="button"
                        onClick={handleSendEmail}
                        disabled={sendingEmails}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendingEmails ? "Đang gửi..." : "Gửi thông báo"}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Preview email */}
                  {showPreview && (
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
        {selectedEmployeeForSuspension && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Đình chỉ tài khoản: {selectedEmployeeForSuspension.name}</CardTitle>
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
                  <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                    <SelectTrigger id="suspensionDuration" className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 giờ</SelectItem>
                      <SelectItem value="24h">24 giờ</SelectItem>
                      <SelectItem value="3d">3 ngày</SelectItem>
                      <SelectItem value="1w">1 tuần</SelectItem>
                      <SelectItem value="permanent">Vĩnh viễn</SelectItem>
                      <SelectItem value="custom">Tùy chỉnh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {suspensionDuration === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customStart">Từ ngày</Label>
                      <Input
                        id="customStart"
                        type="datetime-local"
                        value={customSuspensionStart}
                        onChange={(e) => setCustomSuspensionStart(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customEnd">Đến ngày</Label>
                      <Input
                        id="customEnd"
                        type="datetime-local"
                        value={customSuspensionEnd}
                        onChange={(e) => setCustomSuspensionEnd(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedEmployeeForSuspension(null)}>
                    Hủy
                  </Button>
                  <Button onClick={handleSuspendEmployee}>Xác nhận đình chỉ</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
