"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, QrCode } from "lucide-react"
import { createRegistrationEmailTemplate, sendEmail } from "@/lib/email-service"
import { useToast } from "@/components/ui/use-toast"

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
  uniqueCode: string
}

export default function EmployeeRegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [generatedQR, setGeneratedQR] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailMode, setEmailMode] = useState<'real' | 'test' | 'error' | 'gmail-error'>('real')
  const [testEmailUrl, setTestEmailUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const generateEmployeeId = () => {
    return "NV" + Date.now().toString().slice(-6)
  }

  const generateQRCode = (empId: string) => {
    const qrData = {
      employeeId: empId,
      type: "employee_qr",
      generatedAt: new Date().toISOString(),
    }
    return JSON.stringify(qrData)
  }

  // Thêm function tạo mã dưới vạch unique
  const generateUniqueCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Trong handleSubmit function, thay đổi phần tạo newEmployee:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.department) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc")
      return
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      alert("Email không hợp lệ. Vui lòng nhập đúng định dạng email.")
      return
    }

    // Kiểm tra định dạng số điện thoại
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone)) {
      alert("Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số.")
      return
    }

    const existingEmployees = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    
    // Kiểm tra email đã tồn tại
    const emailExists = existingEmployees.some((emp: any) => emp.email.toLowerCase() === formData.email.toLowerCase())
    if (emailExists) {
      alert("Email này đã được đăng ký. Vui lòng sử dụng email khác.")
      return
    }

    // Kiểm tra số điện thoại đã tồn tại (nếu có)
    if (formData.phone) {
      const phoneExists = existingEmployees.some((emp: any) => emp.phone === formData.phone)
      if (phoneExists) {
        alert("Số điện thoại này đã được đăng ký. Vui lòng sử dụng số điện thoại khác.")
        return
      }
    }

    const newEmployeeId = generateEmployeeId()
    const uniqueCode = generateUniqueCode()

    // Kiểm tra mã không trùng lặp
    const codeExists = existingEmployees.some((emp: any) => emp.uniqueCode === uniqueCode)

    if (codeExists) {
      // Tạo lại mã nếu trùng
      return handleSubmit(e)
    }

    const qrCodeData = generateQRCode(newEmployeeId)

    const newEmployee: EmployeeRegistration = {
      id: newEmployeeId,
      ...formData,
      status: "pending",
      qrCode: qrCodeData,
      uniqueCode: uniqueCode,
      registeredAt: new Date().toISOString(),
    }

    existingEmployees.push(newEmployee)
    localStorage.setItem("employeeRegistrations", JSON.stringify(existingEmployees))

    setEmployeeId(newEmployeeId)
    setGeneratedQR(qrCodeData)
    setIsSubmitted(true)
    
    // Gửi email sau khi đăng ký thành công
    await sendRegistrationEmail(newEmployee, qrCodeData, uniqueCode)
  }

  // Thêm function gửi email đăng ký
  const sendRegistrationEmail = async (employee: EmployeeRegistration, qrCodeData: string, uniqueCode: string) => {
    try {
      setSendingEmail(true)
      
      // Lấy URL của QR code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}`
      
      // Tạo nội dung email
      const html = createRegistrationEmailTemplate({
        name: employee.name,
        employeeId: employee.id,
        qrCodeDataUrl: qrCodeUrl,
        uniqueCode: uniqueCode,
        department: employee.department,
        position: employee.position || "Chưa cập nhật",
      })
      
      console.log('Sending email to', employee.email);
      
      // Gửi email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: employee.email,
          subject: "Đăng ký tài khoản chấm công thành công",
          html,
        }),
      });
      
      const result = await response.json();
      console.log('Email API response:', result);
      
      if (result.success) {
        setEmailSent(true);
        
        if (result.previewUrl) {
          console.log('Email preview URL (development only):', result.previewUrl);
          // Đây là email giả lập Ethereal, không phải email thật
          setEmailMode('test');
          setTestEmailUrl(result.previewUrl);
          window.open(result.previewUrl, '_blank');
          
          toast({
            title: "Email giả lập đã tạo",
            description: "Bạn đang dùng email giả lập (Ethereal). Email không được gửi đến địa chỉ thật.",
          });
        } else {
          // Email thật đã được gửi
          setEmailMode('real');
          
          toast({
            title: "Gửi email thành công",
            description: "Thông tin chấm công đã được gửi đến email của bạn",
          });
        }
      } else {
        console.error('Email sending failed:', result.error, result.details);
        
        // Kiểm tra nếu là lỗi Gmail
        if (result.details?.includes('535-5.7.8') || result.details?.includes('Bad credentials')) {
          setEmailMode('gmail-error');
          
          toast({
            variant: "destructive",
            title: "Lỗi xác thực Gmail",
            description: "Gmail từ chối mật khẩu. Xem hướng dẫn khắc phục lỗi Gmail.",
          });
        } else {
          setEmailMode('error');
          
          toast({
            variant: "destructive",
            title: "Không thể gửi email",
            description: result.details || "Đã có lỗi xảy ra khi gửi email. Vui lòng lưu lại thông tin của bạn.",
          });
        }
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setEmailMode('error');
      
      toast({
        variant: "destructive",
        title: "Không thể gửi email",
        description: "Đã có lỗi xảy ra khi gửi email. Vui lòng lưu lại thông tin của bạn.",
      });
    } finally {
      setSendingEmail(false);
    }
  }

  const downloadQRCode = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedQR)}`
    const link = document.createElement("a")
    link.href = qrUrl
    link.download = `QR_${employeeId}.png`
    link.click()
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Cập nhật phần hiển thị thông báo email
  const renderEmailStatus = () => {
    if (sendingEmail) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm flex items-center">
            <span className="mr-2 inline-block w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full animate-spin"></span>
            Đang gửi email...
          </p>
        </div>
      );
    }
    
    if (emailSent) {
      if (emailMode === 'test') {
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            <p className="text-yellow-800 text-sm">
              <strong>CHÚ Ý:</strong> Đây là môi trường phát triển sử dụng email giả lập.
            </p>
            <p className="text-yellow-700 text-sm">
              Email không được gửi thực sự đến {formData.email}. 
              Vui lòng cấu hình EMAIL_USER và EMAIL_PASSWORD trong file .env.local.
            </p>
            <div className="flex gap-2 mt-2">
              {testEmailUrl && (
                <Button 
                  variant="outline" 
                  className="text-xs flex-1" 
                  onClick={() => window.open(testEmailUrl, '_blank')}
                >
                  Xem email mẫu
                </Button>
              )}
              <Button 
                variant="outline" 
                className="text-xs flex-1" 
                onClick={() => router.push('/docs/email-config')}
              >
                Xem hướng dẫn cấu hình
              </Button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              Thông tin đăng ký đã được gửi đến email {formData.email}
            </p>
            <p className="text-green-700 text-xs mt-1">
              Nếu không thấy email trong hộp thư đến, vui lòng kiểm tra thư mục spam.
            </p>
          </div>
        );
      }
    }
    
    if (emailMode === 'gmail-error') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
          <p className="text-red-800 text-sm font-medium">
            Lỗi xác thực Gmail (535-5.7.8)
          </p>
          <p className="text-red-700 text-sm">
            Gmail từ chối kết nối. Bạn cần cấu hình mật khẩu ứng dụng (App Password) cho tài khoản Gmail.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-1 border-red-200 bg-white text-red-800 hover:bg-red-50"
            onClick={() => router.push('/docs/gmail-fix')}
          >
            Xem hướng dẫn khắc phục
          </Button>
        </div>
      );
    }
    
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-orange-800 text-sm mb-2">
          {emailMode === 'error' ? 
            'Không thể gửi email. Vui lòng lưu thông tin của bạn.' : 
            'Chưa thể gửi email. Vui lòng lưu lại thông tin của bạn.'}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs w-full" 
          onClick={() => router.push('/docs/email-config')}
        >
          Xem hướng dẫn cấu hình email
        </Button>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Về trang chủ
          </Button>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl text-green-600">Đăng ký thành công!</CardTitle>
              <CardDescription>
                Mã nhân viên của bạn: <strong>{employeeId}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedQR)}`}
                    alt="QR Code cá nhân"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">Mã QR chấm công cá nhân của bạn</p>
              </div>

              <Button onClick={downloadQRCode} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Tải xuống mã QR
              </Button>
              
              {renderEmailStatus()}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Lưu ý quan trọng:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Lưu mã QR này vào điện thoại của bạn</li>
                  <li>• Tài khoản đang chờ admin duyệt</li>
                  <li>• Sau khi được duyệt, bạn có thể dùng mã QR để chấm công</li>
                  <li>• Nếu bị từ chối, mã QR sẽ không còn hiệu lực</li>
                </ul>
              </div>

              <div className="text-center">
                <Button variant="outline" onClick={() => router.push("/attendance")}>
                  Thử chấm công ngay
                </Button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Mã dưới vạch (để nhập thủ công):</p>
                <p className="text-lg font-mono font-bold text-center bg-white p-3 rounded border-2 border-dashed">
                  {
                    JSON.parse(localStorage.getItem("employeeRegistrations") || "[]").find(
                      (emp: any) => emp.id === employeeId,
                    )?.uniqueCode
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Đăng ký nhân viên</CardTitle>
            <CardDescription>Điền thông tin để tạo tài khoản và nhận mã QR chấm công</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="example@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="0123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Phòng ban *</Label>
                <Select onValueChange={(value) => handleInputChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT">Công nghệ thông tin</SelectItem>
                    <SelectItem value="HR">Nhân sự</SelectItem>
                    <SelectItem value="Finance">Tài chính</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Kinh doanh</SelectItem>
                    <SelectItem value="Operations">Vận hành</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Vị trí công việc</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  placeholder="Developer, Manager, ..."
                />
              </div>

              <Button type="submit" className="w-full">
                Đăng ký và tạo mã QR
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
