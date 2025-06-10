"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrScanner } from "@/components/qr-scanner"
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle, History, Calendar, Camera } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { emailTemplates } from "@/lib/emailTemplates"
import { useCustomAlert } from "@/components/custom-alert"

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  type: "check-in" | "check-out"
  timestamp: string
  location?: string
  faceImage?: string
}

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

  const { showAlert } = useCustomAlert()

  // Thêm state cho chụp ảnh khuôn mặt
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [countdown, setCountdown] = useState(3)
  const [tempEmployeeData, setTempEmployeeData] = useState<{
    employee: EmployeeRegistration;
    action: "check-in" | "check-out";
  } | null>(null)

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

  // Component xử lý chụp ảnh khuôn mặt
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout;

    // Khởi tạo camera khi hiển thị
    if (showFaceCapture) {
      const startVideo = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 }
            } 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Lỗi truy cập camera: ", err);
          showAlert("Không thể truy cập camera. Vui lòng cấp quyền và thử lại.", "error");
          setShowFaceCapture(false);
        }
      };

      startVideo();

      // Tự động chụp sau 3 giây
      setCountdown(3);
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(countdownTimer);
            captureImage();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup khi unmount
    return () => {
      if (countdownTimer) clearInterval(countdownTimer);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [showFaceCapture]);

  // Xử lý chụp hình
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      // Chụp ảnh từ video
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setFaceImage(imageDataUrl);
      
      // Tắt camera
      const tracks = (video.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      
      // Lưu bản ghi và hiển thị xác nhận - không tự động lưu ở đây
      // để tránh ghi nhận trùng lặp
    }
    
    setIsCapturing(false);
  };

  // Lưu dữ liệu chấm công với hình ảnh khuôn mặt
  const saveFaceAttendance = (employee: EmployeeRegistration, action: "check-in" | "check-out", faceImageData: string) => {
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem("attendanceRecords") || "[]");
    const currentTimestamp = new Date().toISOString();
    
    // Kiểm tra xem đã có bản ghi tương tự được tạo trong 5 giây qua chưa
    // (để tránh lưu trùng lặp do có nhiều sự kiện xảy ra)
    const recentlySaved = attendanceRecords.find(record => 
      record.employeeId === employee.id && 
      record.type === action &&
      Math.abs(new Date(record.timestamp).getTime() - new Date(currentTimestamp).getTime()) < 5000
    );
    
    // Nếu đã có bản ghi tương tự gần đây, không lưu thêm
    if (recentlySaved) {
      console.log("Phát hiện bản ghi trùng lặp, không lưu thêm");
      
      // Vẫn hiển thị kết quả chấm công
      if (action === "check-out") {
        const today = new Date().toDateString();
        const todayRecords = attendanceRecords.filter(
          (record) => record.employeeId === employee.id && new Date(record.timestamp).toDateString() === today,
        );
        
        const lastCheckIn = todayRecords.filter((r) => r.type === "check-in").pop();
        if (lastCheckIn) {
          const workTime = calculateWorkingTime(lastCheckIn.timestamp, currentTimestamp);
          
          // Cảnh báo nếu làm dưới 1 tiếng
          if (workTime.totalMinutes < 60) {
            setScanResult({
              success: true,
              message: `⚠️ Cảnh báo: Bạn làm việc chưa đủ 1 tiếng! Thời gian làm việc: ${workTime.hours} giờ ${workTime.minutes} phút`,
              employee,
              action,
              workingTime: workTime,
              isShortWork: true,
            });
          } else {
            setScanResult({
              success: true,
              message: `Chấm công ra thành công! Thời gian làm việc hôm nay: ${workTime.hours} giờ ${workTime.minutes} phút`,
              employee,
              action,
              workingTime: workTime,
              isShortWork: false,
            });
          }
        }
      } else {
        setScanResult({
          success: true,
          message: `Chấm công vào thành công!`,
          employee,
          action,
        });
      }
      
      setShowFaceCapture(false);
      setTempEmployeeData(null);
      return;
    }
    
    // Tạo bản ghi chấm công mới với hình ảnh
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.name,
      type: action,
      timestamp: currentTimestamp,
      location: "Văn phòng chính",
      faceImage: faceImageData
    };

    attendanceRecords.push(newRecord);
    localStorage.setItem("attendanceRecords", JSON.stringify(attendanceRecords));

    // Tính toán và hiển thị kết quả
    const today = new Date().toDateString();
    const todayRecords = attendanceRecords.filter(
      (record) => record.employeeId === employee.id && new Date(record.timestamp).toDateString() === today,
    );

    // Biến để lưu thông tin giờ làm việc (chỉ có khi checkout)
    let workTime = null;

    if (action === "check-out") {
      const lastCheckIn = todayRecords.filter((r) => r.type === "check-in").pop();
      if (lastCheckIn) {
        workTime = calculateWorkingTime(lastCheckIn.timestamp, currentTimestamp);
        
        // Cảnh báo nếu làm dưới 1 tiếng
        if (workTime.totalMinutes < 60) {
          setScanResult({
            success: true,
            message: `⚠️ Cảnh báo: Bạn làm việc chưa đủ 1 tiếng! Thời gian làm việc: ${workTime.hours} giờ ${workTime.minutes} phút`,
            employee,
            action,
            workingTime: workTime,
            isShortWork: true,
          });
        } else {
          setScanResult({
            success: true,
            message: `Chấm công ra thành công! Thời gian làm việc hôm nay: ${workTime.hours} giờ ${workTime.minutes} phút`,
            employee,
            action,
            workingTime: workTime,
            isShortWork: false,
          });
        }
      }
    } else {
      setScanResult({
        success: true,
        message: `Chấm công vào thành công!`,
        employee,
        action,
      });
    }

    // Gửi email thông báo chấm công
    if (employee.email) {
      // Lấy template email tương ứng (check-in hoặc check-out)
      const templateId = action === "check-in" ? "checkin" : "checkout";
      const template = emailTemplates.find(t => t.id === templateId);
      
      if (template) {
        // Format nội dung email
        let emailContent = template.content
          .replace(/{employeeName}/g, employee.name)
          .replace(/{timestamp}/g, new Date(currentTimestamp).toLocaleString("vi-VN"))
          .replace(/{location}/g, "Văn phòng chính");
        
        // Nếu là check-out, thêm thông tin thời gian làm việc
        if (action === "check-out" && workTime) {
          emailContent = emailContent
            .replace(/{workingHours}/g, workTime.hours.toString())
            .replace(/{workingMinutes}/g, workTime.minutes.toString());
        }
        
        // Gửi email
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            to: employee.email, 
            subject: template.subject, 
            html: emailContent 
          }),
        })
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to send email');
          }
          return res.json();
        })
        .then(data => {
          console.log('Email notification sent successfully:', data);
        })
        .catch(error => {
          console.error('Failed to send email notification:', error);
        });
      }
    }

    setShowFaceCapture(false);
    setTempEmployeeData(null);
  };

  // Chỉnh sửa hàm xử lý QR để chuyển sang chụp ảnh sau khi quét thành công
  const handleQRScan = (data: string) => {
    try {
      console.log("Received QR data in parent component:", data);
      const qrData = JSON.parse(data);

      if (qrData.type !== "employee_qr") {
        console.log("Invalid QR type:", qrData.type);
        setScanResult({
          success: false,
          message: "Mã QR không hợp lệ. Vui lòng sử dụng mã QR chấm công của nhân viên.",
        });
        setShowScanner(false);
        return;
      }

      // Tìm nhân viên trong hệ thống
      const employees: EmployeeRegistration[] = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]");
      const employee = employees.find((emp) => emp.id === qrData.employeeId);

      if (!employee) {
        setScanResult({
          success: false,
          message: "Không tìm thấy thông tin nhân viên. Vui lòng liên hệ admin.",
        });
        return;
      }

      // Xác minh mã QR thuộc về nhân viên đã đăng ký
      const employeesList = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]");
      const employeeFromList = employeesList.find((emp: EmployeeRegistration) => emp.id === qrData.employeeId);
      
      if (!employeeFromList) {
        setScanResult({
          success: false,
          message: "Mã QR không khớp với bất kỳ nhân viên nào trong hệ thống.",
        });
        setShowScanner(false);
        return;
      }

      if (employee.status === "suspended") {
        const now = new Date()
        const suspensionEndDate = employee.suspensionEnd ? new Date(employee.suspensionEnd) : null

        // Kiểm tra xem đã hết hạn đình chỉ chưa
        if (suspensionEndDate && now > suspensionEndDate) {
          // Tự động khôi phục
          const updatedEmployees = employees.map(emp => 
            emp.id === employee.id ? { ...emp, status: "approved", suspensionReason: undefined, suspensionStart: undefined, suspensionEnd: undefined } : emp
          )
          localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))
          
          // Gửi email thông báo
          const restorationTemplate = emailTemplates.find(t => t.id === 'restoration')
          if (restorationTemplate) {
            const emailContent = restorationTemplate.content.replace(/{employeeName}/g, employee.name)
            fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: employee.email, subject: restorationTemplate.subject, html: emailContent }),
            }).catch(error => console.error("Lỗi gửi email tự động khôi phục:", error))
          }

          // Gán lại employee đã được cập nhật để xử lý chấm công
          Object.assign(employee, updatedEmployees.find(e => e.id === employee.id))

        } else {
          // Vẫn còn trong thời gian đình chỉ
          setScanResult({
            success: false,
            message: `Tài khoản của bạn đã bị đình chỉ. Lý do: ${employee.suspensionReason || 'Không có lý do'}. Hiệu lực đến: ${
              employee.suspensionEnd === "permanent" ? "Vĩnh viễn" : new Date(employee.suspensionEnd!).toLocaleString("vi-VN")
            }`,
          })
          setShowScanner(false)
          return
        }
      }

      // Kiểm tra trạng thái chấm công hôm nay
      const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem("attendanceRecords") || "[]");
      const today = new Date().toDateString();
      const todayRecords = attendanceRecords.filter(
        (record) => record.employeeId === employee.id && new Date(record.timestamp).toDateString() === today,
      );

      // Xác định hành động (check-in hoặc check-out)
      const lastRecord = todayRecords[todayRecords.length - 1];
      const action = !lastRecord || lastRecord.type === "check-out" ? "check-in" : "check-out";

      // Thay vì lưu ngay, chuyển sang bước chụp ảnh xác thực khuôn mặt
      setTempEmployeeData({ employee, action });
      setShowScanner(false);
      setShowFaceCapture(true);
      
    } catch (error) {
      setScanResult({
        success: false,
        message: "Mã QR không đúng định dạng. Vui lòng thử lại.",
      });
      setShowScanner(false);
    }
  };

  // Thay đổi handleManualSubmit để sử dụng quy trình mới
  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      showAlert("Vui lòng nhập mã", "warning");
      return;
    }

    // Tìm nhân viên dựa trên mã
    const employees: EmployeeRegistration[] = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]");
    const employee = employees.find((emp) => emp.uniqueCode === manualCode.trim());

    if (!employee) {
      setScanResult({ success: false, message: "Mã không hợp lệ hoặc không tìm thấy nhân viên." });
      return;
    }

    // Xác minh mã nhân viên có tồn tại trong danh sách nhân viên
    const employeesList = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]");
    const employeeFromList = employeesList.find((emp: EmployeeRegistration) => emp.id === employee.id);
    
    if (!employeeFromList) {
      setScanResult({
        success: false,
        message: "Không tìm thấy thông tin nhân viên trong hệ thống.",
      });
      return;
    }

    // Xử lý các trường hợp trạng thái khác nhau (đình chỉ, từ chối...)
    if (employee.status === "pending") {
      setScanResult({
        success: false,
        message: "Tài khoản của bạn đang chờ admin duyệt. Vui lòng thử lại sau.",
      });
      return;
    }

    if (employee.status === "rejected") {
      setScanResult({
        success: false,
        message: "Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ admin.",
      });
      return;
    }

    if (employee.status === "suspended") {
      const now = new Date()
      const suspensionEndDate = employee.suspensionEnd ? new Date(employee.suspensionEnd) : null

      if (suspensionEndDate && now > suspensionEndDate && employee.suspensionEnd !== 'permanent') {
        const updatedEmployees = employees.map(e => 
          e.id === employee.id ? { ...e, status: "approved", suspensionReason: undefined, suspensionStart: undefined, suspensionEnd: undefined } : e
        )
        localStorage.setItem("employeeRegistrations", JSON.stringify(updatedEmployees))

        // Gửi email thông báo
        const restorationTemplate = emailTemplates.find(t => t.id === 'restoration')
        if (restorationTemplate) {
          const emailContent = restorationTemplate.content.replace(/{employeeName}/g, employee.name)
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: employee.email, subject: restorationTemplate.subject, html: emailContent }),
          }).catch(error => console.error("Lỗi gửi email tự động khôi phục:", error))
        }

        Object.assign(employee, updatedEmployees.find(e => e.id === employee.id))

      } else {
        setScanResult({
          success: false,
          message: `Tài khoản của bạn đã bị đình chỉ. Lý do: ${employee.suspensionReason || 'Không có lý do'}. Hiệu lực đến: ${
            employee.suspensionEnd === "permanent" ? "Vĩnh viễn" : new Date(employee.suspensionEnd!).toLocaleString("vi-VN")
          }`,
        })
        return
      }
    }

    // Xác định hành động (check-in hoặc check-out)
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem("attendanceRecords") || "[]");
    const today = new Date().toDateString();
    const todayRecords = attendanceRecords.filter(
      (record) => record.employeeId === employee.id && new Date(record.timestamp).toDateString() === today,
    );

    const lastRecord = todayRecords[todayRecords.length - 1];
    const action = !lastRecord || lastRecord.type === "check-out" ? "check-in" : "check-out";

    // Chuyển sang bước chụp ảnh xác thực khuôn mặt
    setTempEmployeeData({ employee, action });
    setShowManualInput(false);
    setManualCode("");
    setShowFaceCapture(true);
  };

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
            {!showScanner && !scanResult && !showManualInput && !showFaceCapture && (
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
                  <Button variant="outline" onClick={() => setShowManualInput(false)} className="flex-1">
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {/* Thêm phần chụp ảnh xác thực khuôn mặt */}
            {showFaceCapture && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium">Xác thực khuôn mặt</h3>
                  <p className="text-sm text-gray-500">
                    Vui lòng đưa khuôn mặt vào khung hình
                    {countdown > 0 && <span className="font-bold"> ({countdown})</span>}
                  </p>
                </div>
                
                <div className="relative rounded-lg overflow-hidden border-2 border-primary mx-auto" style={{ width: '300px', height: '300px' }}>
                  {!faceImage ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img src={faceImage} alt="Captured face" className="w-full h-full object-cover" />
                  )}
                  
                  {/* Overlay hiển thị khung hình dẫn hướng */}
                  <div className="absolute inset-8 border-4 border-dashed border-white opacity-50 rounded"></div>
                </div>
                
                {/* Canvas ẩn để xử lý hình ảnh */}
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                
                <div className="flex gap-2">
                  {faceImage && (
                    <>
                      <Button onClick={() => {
                        if (tempEmployeeData && faceImage) {
                          saveFaceAttendance(tempEmployeeData.employee, tempEmployeeData.action, faceImage);
                        }
                      }} className="flex-1">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Xác nhận
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setFaceImage(null);
                        setShowFaceCapture(true);
                      }} className="flex-1">
                        <Camera className="w-4 h-4 mr-2" />
                        Chụp lại
                      </Button>
                    </>
                  )}
                  {!faceImage && (
                    <Button variant="outline" onClick={() => {
                      setShowFaceCapture(false);
                      setTempEmployeeData(null);
                    }} className="w-full">
                      Hủy
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Kết quả sau khi chấm công */}
            {scanResult && !showWorkingHistory && (
              <div className="space-y-4 text-center">
                {scanResult.success ? (
                  <div className="py-6">
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                      <h3 className="text-xl font-bold mb-2">
                        {scanResult.action === "check-in" ? "Chấm công vào thành công!" : "Chấm công ra thành công!"}
                      </h3>
                      <p>
                        {scanResult.message}
                      </p>
                    </div>

                    {scanResult.employee && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium text-lg mb-2">{scanResult.employee.name}</h4>
                        <p className="text-gray-500 mb-1">{scanResult.employee.department} • {scanResult.employee.position}</p>
                        <p className="text-sm text-gray-500">
                          {new Date().toLocaleString("vi-VN")}
                        </p>
                      </div>
                    )}

                    {scanResult.isShortWork && (
                      <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-sm">Thời gian làm việc dưới 1 giờ sẽ được báo cáo tới quản lý</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      {scanResult.employee && (
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

                      <Button onClick={resetScan} className="flex-1">
                        Trang chủ
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6">
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                      <XCircle className="w-12 h-12 mx-auto mb-2" />
                      <h3 className="text-xl font-bold mb-2">Không thành công</h3>
                      <p>{scanResult.message}</p>
                    </div>

                    <Button onClick={resetScan} className="w-full">
                      Thử lại
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Working History Modal */}
            {showWorkingHistory && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Lịch sử làm việc</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowWorkingHistory(false)}>
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {workingHistory.map((day, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                          <h4 className="font-medium">{new Date(day.date).toLocaleDateString("vi-VN")}</h4>
                        </div>
                        <Badge variant={day.totalMinutes >= 480 ? "default" : "outline"}>
                          {day.totalWorkingTime.hours}h {day.totalWorkingTime.minutes}m
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {day.sessions.map((session: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-2 text-sm border-t pt-2">
                            <div>
                              <p className="text-gray-500">Vào:</p>
                              <p>{new Date(session.checkIn).toLocaleTimeString("vi-VN")}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Ra:</p>
                              <p>
                                {session.checkOut ? new Date(session.checkOut).toLocaleTimeString("vi-VN") : "Chưa checkout"}
                              </p>
                            </div>
                            {session.duration && (
                              <div className="col-span-2 mt-1">
                                <Badge variant="secondary" className="font-normal">
                                  {session.duration.hours}h {session.duration.minutes}m
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {workingHistory.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>Chưa có dữ liệu chấm công</p>
                    </div>
                  )}
                </div>

                <Button onClick={() => setShowWorkingHistory(false)} className="w-full">
                  Đóng
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
