"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrScanner } from "@/components/qr-scanner"
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle, History } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  type: "check-in" | "check-out"
  timestamp: string
  location?: string
}

interface EmployeeRegistration {
  id: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  status: "pending" | "approved" | "rejected"
  qrCode: string
  registeredAt: string
  uniqueCode?: string // Mã dưới vạch
}

export default function AttendancePage() {
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    employee?: EmployeeRegistration
    action?: "check-in" | "check-out"
    workingTime?: { hours: number; minutes: number; seconds: number; totalMinutes: number }
    isShortWork?: boolean
    showHistory?: boolean
  } | null>(null)
  const router = useRouter()

  // Thêm state cho manual input
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCode, setManualCode] = useState("")

  const [showWorkingHistory, setShowWorkingHistory] = useState(false)
  const [workingHistory, setWorkingHistory] = useState<any[]>([])

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

  // Thêm function lấy lịch sử làm việc
  const getWorkingHistory = (employeeId: string) => {
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")
    const records = attendanceRecords.filter((record) => record.employeeId === employeeId)

    // Nhóm theo ngày
    const dailyRecords = records.reduce(
      (acc, record) => {
        const date = new Date(record.timestamp).toDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(record)
        return acc
      },
      {} as Record<string, AttendanceRecord[]>,
    )

    // Tính toán giờ làm việc cho mỗi ngày
    return Object.entries(dailyRecords)
      .map(([date, dayRecords]) => {
        const checkIns = dayRecords
          .filter((r) => r.type === "check-in")
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        const checkOuts = dayRecords
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

        // Nếu có check-in mà chưa check-out
        if (checkIns.length > checkOuts.length) {
          const lastCheckIn = checkIns[checkIns.length - 1]
          sessions.push({
            checkIn: lastCheckIn.timestamp,
            checkOut: null,
            duration: null,
          })
        }

        const totalHours = Math.floor(totalWorkingMinutes / 60)
        const totalMins = totalWorkingMinutes % 60

        return {
          date,
          sessions,
          totalWorkingTime: { hours: totalHours, minutes: totalMins },
          totalMinutes: totalWorkingMinutes,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const handleQRScan = (data: string) => {
    try {
      console.log("Received QR data in parent component:", data)
      const qrData = JSON.parse(data)

      if (qrData.type !== "employee_qr") {
        console.log("Invalid QR type:", qrData.type)
        setScanResult({
          success: false,
          message: "Mã QR không hợp lệ. Vui lòng sử dụng mã QR chấm công của nhân viên.",
        })
        // Even in case of invalid type, hide scanner and show error results
        setShowScanner(false)
        return
      }

      // Tìm nhân viên trong hệ thống
      const employees: EmployeeRegistration[] = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
      const employee = employees.find((emp) => emp.id === qrData.employeeId)

      if (!employee) {
        setScanResult({
          success: false,
          message: "Không tìm thấy thông tin nhân viên. Vui lòng liên hệ admin.",
        })
        return
      }

      if (employee.status === "pending") {
        setScanResult({
          success: false,
          message: "Tài khoản của bạn đang chờ admin duyệt. Vui lòng thử lại sau.",
        })
        return
      }

      if (employee.status === "rejected") {
        setScanResult({
          success: false,
          message: "Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ admin.",
        })
        return
      }

      // Kiểm tra trạng thái chấm công hôm nay
      const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")
      const today = new Date().toDateString()
      const todayRecords = attendanceRecords.filter(
        (record) => record.employeeId === employee.id && new Date(record.timestamp).toDateString() === today,
      )

      // Xác định hành động (check-in hoặc check-out)
      const lastRecord = todayRecords[todayRecords.length - 1]
      const action = !lastRecord || lastRecord.type === "check-out" ? "check-in" : "check-out"

      // Tạo bản ghi chấm công mới
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        employeeId: employee.id,
        employeeName: employee.name,
        type: action,
        timestamp: new Date().toISOString(),
        location: "Văn phòng chính",
      }

      // Lưu vào localStorage
      attendanceRecords.push(newRecord)
      localStorage.setItem("attendanceRecords", JSON.stringify(attendanceRecords))

      // Kiểm tra nếu là check-out và tính thời gian làm việc
      if (action === "check-out") {
        const lastCheckIn = todayRecords.filter((r) => r.type === "check-in").pop()
        if (lastCheckIn) {
          const workTime = calculateWorkingTime(lastCheckIn.timestamp, new Date().toISOString())

          // Cảnh báo nếu làm dưới 1 tiếng
          if (workTime.totalMinutes < 60) {
            setScanResult({
              success: true,
              message: `⚠️ Cảnh báo: Bạn làm việc chưa đủ 1 tiếng! Thời gian làm việc: ${workTime.hours} giờ ${workTime.minutes} phút ${workTime.seconds} giây`,
              employee,
              action,
              workingTime: workTime,
              isShortWork: true,
            })
          } else {
            setScanResult({
              success: true,
              message: `Chấm công ra thành công! Thời gian làm việc hôm nay: ${workTime.hours} giờ ${workTime.minutes} phút ${workTime.seconds} giây`,
              employee,
              action,
              workingTime: workTime,
              isShortWork: false,
            })
          }
        }
      } else {
        setScanResult({
          success: true,
          message: `Chấm công vào thành công!`,
          employee,
          action,
        })
      }

      // Automatically hide scanner and show results
      setShowScanner(false)
    } catch (error) {
      setScanResult({
        success: false,
        message: "Mã QR không đúng định dạng. Vui lòng thử lại.",
      })
      // Even in case of error, hide scanner and show error results
      setShowScanner(false)
    }
  }

  // Thêm function xử lý nhập thủ công
  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      alert("Vui lòng nhập mã")
      return
    }

    // Tìm nhân viên theo mã dưới vạch
    const employees: EmployeeRegistration[] = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    const employee = employees.find((emp) => emp.uniqueCode === manualCode.toUpperCase())

    if (!employee) {
      setScanResult({
        success: false,
        message: "Mã không hợp lệ. Vui lòng kiểm tra lại.",
      })
      return
    }

    // Sử dụng logic tương tự như QR scan
    if (employee.status === "pending") {
      setScanResult({
        success: false,
        message: "Tài khoản của bạn đang chờ admin duyệt. Vui lòng thử lại sau.",
      })
      return
    }

    if (employee.status === "rejected") {
      setScanResult({
        success: false,
        message: "Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ admin.",
      })
      return
    }

    // Tiếp tục logic chấm công như QR scan...
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")
    const today = new Date().toDateString()
    const todayRecords = attendanceRecords.filter(
      (record) => record.employeeId === employee.id && new Date(record.timestamp).toDateString() === today,
    )

    const lastRecord = todayRecords[todayRecords.length - 1]
    const action = !lastRecord || lastRecord.type === "check-out" ? "check-in" : "check-out"

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.name,
      type: action,
      timestamp: new Date().toISOString(),
      location: "Văn phòng chính",
    }

    attendanceRecords.push(newRecord)
    localStorage.setItem("attendanceRecords", JSON.stringify(attendanceRecords))

    setScanResult({
      success: true,
      message: `Chấm công ${action === "check-in" ? "vào" : "ra"} thành công!`,
      employee,
      action,
    })

    setShowManualInput(false)
    setManualCode("")
  }

  const resetScan = () => {
    setScanResult(null)
    setShowScanner(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Về trang chủ
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Clock className="w-6 h-6" />
              Chấm công
            </CardTitle>
            <CardDescription>Quét mã QR cá nhân để ghi nhận giờ vào/ra</CardDescription>
          </CardHeader>
          <CardContent>
            {!showScanner && !scanResult && !showManualInput && (
              <div className="space-y-3">
                <Button onClick={() => setShowScanner(true)} className="w-full" size="lg">
                  Quét mã QR
                </Button>
                <Button onClick={() => setShowManualInput(true)} variant="outline" className="w-full">
                  Nhập mã thủ công
                </Button>
              </div>
            )}

            {showScanner && !scanResult && (
              <div className="space-y-4">
                <QrScanner onScan={handleQRScan} />
                <Button variant="outline" onClick={() => setShowScanner(false)} className="w-full">
                  Hủy
                </Button>
              </div>
            )}

            {showManualInput && !scanResult && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manualCode">Nhập mã dưới vạch</Label>
                  <Input
                    id="manualCode"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="VD: SR01ZE31424ZD012"
                    className="font-mono text-center"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleManualSubmit} className="flex-1">
                    Xác nhận
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowManualInput(false)
                      setManualCode("")
                    }}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {scanResult && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg border-2 ${
                    scanResult.success
                      ? scanResult.isShortWork
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {scanResult.success ? (
                      scanResult.isShortWork ? (
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <h3
                      className={`font-medium ${
                        scanResult.success
                          ? scanResult.isShortWork
                            ? "text-yellow-800"
                            : "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {scanResult.success ? "Thành công!" : "Lỗi!"}
                    </h3>
                  </div>

                  <p
                    className={`text-sm ${
                      scanResult.success
                        ? scanResult.isShortWork
                          ? "text-yellow-700"
                          : "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {scanResult.message}
                  </p>

                  {scanResult.success && scanResult.employee && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-600">Nhân viên:</span>
                          <span className="font-medium">{scanResult.employee.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Mã NV:</span>
                          <span className="font-medium">{scanResult.employee.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Phòng ban:</span>
                          <span className="font-medium">{scanResult.employee.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Thời gian:</span>
                          <span className="font-medium">{new Date().toLocaleString("vi-VN")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Hành động:</span>
                          <Badge variant={scanResult.action === "check-in" ? "default" : "secondary"}>
                            {scanResult.action === "check-in" ? "Vào làm" : "Ra về"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={resetScan} className="flex-1">
                    Quét mã QR khác
                  </Button>
                  {scanResult.success && scanResult.employee && scanResult.action === "check-out" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const history = getWorkingHistory(scanResult.employee!.id)
                        setWorkingHistory(history)
                        setShowWorkingHistory(true)
                      }}
                      className="flex-1"
                    >
                      <History className="w-4 h-4 mr-2" />
                      Xem lịch sử
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-1">Hướng dẫn sử dụng:</p>
                <ul className="space-y-1">
                  <li>• Sử dụng mã QR cá nhân đã được cấp khi đăng ký</li>
                  <li>• Tài khoản phải được admin duyệt mới có thể chấm công</li>
                  <li>• Hệ thống tự động xác định vào/ra dựa trên lần quét cuối</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Working History Modal */}
      {showWorkingHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle>Lịch sử làm việc</CardTitle>
              <CardDescription>
                {scanResult?.employee?.name} - {scanResult?.employee?.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-4">
                {workingHistory.map((day, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">
                        {new Date(day.date).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </h4>
                      <Badge variant="outline">
                        Tổng: {day.totalWorkingTime.hours}h {day.totalWorkingTime.minutes}m
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {day.sessions.map((session: any, sessionIndex: number) => (
                        <div key={sessionIndex} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              <span className="text-green-600">Vào:</span>{" "}
                              {new Date(session.checkIn).toLocaleTimeString("vi-VN")}
                            </div>
                            {session.checkOut ? (
                              <div className="text-sm">
                                <span className="text-red-600">Ra:</span>{" "}
                                {new Date(session.checkOut).toLocaleTimeString("vi-VN")}
                              </div>
                            ) : (
                              <div className="text-sm text-orange-600">Chưa ra</div>
                            )}
                          </div>
                          {session.duration && (
                            <Badge variant={session.duration.totalMinutes < 60 ? "destructive" : "default"}>
                              {session.duration.hours}h {session.duration.minutes}m {session.duration.seconds}s
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t">
              <Button onClick={() => setShowWorkingHistory(false)} className="w-full">
                Đóng
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
