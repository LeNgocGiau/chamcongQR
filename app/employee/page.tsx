"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrScanner } from "@/components/qr-scanner"
import { LogOut, Clock, CheckCircle, XCircle, History } from "lucide-react"
import { useCustomAlert } from "@/components/custom-alert"

interface AttendanceRecord {
  id: string
  employeeId: string
  type: "check-in" | "check-out"
  timestamp: string
  location?: string
}

export default function EmployeePage() {
  const [employeeId, setEmployeeId] = useState("")
  const [currentStatus, setCurrentStatus] = useState<"out" | "in">("out")
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const router = useRouter()
  const { showAlert } = useCustomAlert()

  useEffect(() => {
    const employee = localStorage.getItem("currentEmployee")
    if (!employee) {
      router.push("/")
      return
    }

    setEmployeeId(employee)
    loadTodayRecords(employee)
  }, [router])

  const loadTodayRecords = (empId: string) => {
    const records = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")
    const today = new Date().toDateString()
    const todayRecords = records.filter(
      (record: AttendanceRecord) => record.employeeId === empId && new Date(record.timestamp).toDateString() === today,
    )

    setTodayRecords(todayRecords)

    // Xác định trạng thái hiện tại
    const lastRecord = todayRecords[todayRecords.length - 1]
    if (lastRecord) {
      setCurrentStatus(lastRecord.type === "check-in" ? "in" : "out")
    }
  }

  const handleQRScan = (data: string) => {
    try {
      const qrData = JSON.parse(data)

      // Kiểm tra tính hợp lệ của QR code
      const now = new Date()
      const qrTime = new Date(qrData.timestamp)
      const timeDiff = Math.abs(now.getTime() - qrTime.getTime()) / (1000 * 60) // phút

      if (timeDiff > 5) {
        showAlert("Mã QR đã hết hạn. Vui lòng quét mã mới.", "warning")
        return
      }

      // Tạo bản ghi chấm công
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        employeeId,
        type: currentStatus === "out" ? "check-in" : "check-out",
        timestamp: new Date().toISOString(),
        location: qrData.location,
      }

      // Lưu vào localStorage
      const existingRecords = JSON.parse(localStorage.getItem("attendanceRecords") || "[]")
      existingRecords.push(newRecord)
      localStorage.setItem("attendanceRecords", JSON.stringify(existingRecords))

      // Cập nhật state
      setTodayRecords([...todayRecords, newRecord])
      setCurrentStatus(newRecord.type === "check-in" ? "in" : "out")
      setShowScanner(false)

      showAlert(
        `${newRecord.type === "check-in" ? "Chấm công vào" : "Chấm công ra"} thành công!`, 
        "success"
      )
    } catch (error) {
      showAlert("Mã QR không hợp lệ", "error")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("currentEmployee")
    router.push("/")
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Xin chào!</CardTitle>
              <CardDescription>Mã NV: {employeeId}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm text-gray-600">Trạng thái hiện tại:</span>
              <Badge variant={currentStatus === "in" ? "default" : "secondary"}>
                {currentStatus === "in" ? "Đã vào làm" : "Chưa vào làm"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Chấm công
            </CardTitle>
            <CardDescription>Quét mã QR để {currentStatus === "out" ? "vào làm" : "ra về"}</CardDescription>
          </CardHeader>
          <CardContent>
            {!showScanner ? (
              <Button onClick={() => setShowScanner(true)} className="w-full" size="lg">
                Quét mã QR
              </Button>
            ) : (
              <div className="space-y-4">
                <QrScanner onScan={handleQRScan} />
                <Button variant="outline" onClick={() => setShowScanner(false)} className="w-full">
                  Hủy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Lịch sử hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Chưa có bản ghi nào</p>
            ) : (
              <div className="space-y-3">
                {todayRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {record.type === "check-in" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{record.type === "check-in" ? "Vào làm" : "Ra về"}</p>
                        <p className="text-sm text-gray-500">{formatTime(record.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
