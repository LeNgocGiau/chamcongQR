"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "lucide-react"

// Thêm interface cho EmployeeRegistration
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

export default function AdminPage() {
  const [employees, setEmployees] = useState<EmployeeRegistration[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRegistration | null>(null)
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
      } else {
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
          <TabsList className="grid w-full grid-cols-6">
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
          </TabsList>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Duyệt đăng ký nhân viên</CardTitle>
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
                <CardDescription>Quản lý tất cả nhân viên trong hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Chưa có nhân viên nào</p>
                  ) : (
                    employees.map((employee) => (
                      <div key={employee.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{employee.name}</h3>
                              <Badge
                                variant={
                                  employee.status === "approved"
                                    ? "default"
                                    : employee.status === "pending"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {employee.status === "approved"
                                  ? "Hoạt động"
                                  : employee.status === "pending"
                                    ? "Chờ duyệt"
                                    : "Bị từ chối"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {employee.id} - {employee.department}
                            </p>
                            <p className="text-sm text-gray-600">{employee.email}</p>
                            <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">Mã: {employee.uniqueCode}</p>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => downloadEmployeeQR(employee)}>
                              <Download className="w-4 h-4 mr-1" />
                              Tải QR
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteEmployee(employee.id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Xóa
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
      </div>
    </div>
  )
}
