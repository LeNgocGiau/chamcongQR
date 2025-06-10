"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, QrCode, AlertCircle, CheckCircle } from "lucide-react"
import { createRegistrationEmailTemplate, sendEmail } from "@/lib/email-service"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCustomAlert } from "@/components/custom-alert"

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

// CSS for animations 
const customStyles = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
.shake {
  animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
}

.input-valid {
  border-color: #22c55e !important;
  transition: all 0.2s ease;
}

.input-field {
  transition: all 0.3s ease;
}

.input-field:focus {
  transform: scale(1.01);
}

.form-success-indicator {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.input-valid + .form-success-indicator {
  opacity: 1;
}

.submit-button {
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.submit-button-ready {
  background: linear-gradient(90deg, #3b82f6, #0ea5e9, #3b82f6);
  background-size: 200% 100%;
  animation: gradientMove 3s ease infinite;
}

.submit-button-ready:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.loading-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

export default function EmployeeRegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
  })
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    department?: string;
  }>({})
  const [shakeFields, setShakeFields] = useState<{
    name?: boolean;
    email?: boolean;
    phone?: boolean;
    department?: boolean;
  }>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedQR, setGeneratedQR] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailMode, setEmailMode] = useState<'real' | 'test' | 'error' | 'gmail-error'>('real')
  const [testEmailUrl, setTestEmailUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const { showAlert } = useCustomAlert()
  const router = useRouter()

  // Reset shake animation after it completes
  useEffect(() => {
    if (Object.values(shakeFields).some(field => field)) {
      const timer = setTimeout(() => {
        setShakeFields({});
      }, 820); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [shakeFields]);

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

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate phone number
  const validatePhone = (phone: string) => {
    // If phone is optional and empty, it's valid
    if (!phone) return true
    // Otherwise check for 10-11 digits
    return /^[0-9]{10,11}$/.test(phone)
  }

  // Check if email exists in localStorage
  const checkEmailExists = (email: string) => {
    const existingEmployees = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    return existingEmployees.some((emp: any) => emp.email.toLowerCase() === email.toLowerCase())
  }

  // Check if phone exists in localStorage
  const checkPhoneExists = (phone: string) => {
    if (!phone) return false
    const existingEmployees = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    return existingEmployees.some((emp: any) => emp.phone === phone)
  }

  // Validate field in real-time with custom alerts
  const validateField = (field: string, value: string) => {
    let newErrors = { ...formErrors };
    
    switch (field) {
      case 'name':
        if (!value) {
          newErrors.name = "Vui lòng nhập họ và tên";
        } else {
          delete newErrors.name;
        }
        break;
        
      case 'email':
        if (!value) {
          newErrors.email = "Vui lòng nhập email";
        } else if (!validateEmail(value)) {
          newErrors.email = "Email không đúng định dạng";
        } else if (checkEmailExists(value)) {
          newErrors.email = "Email này đã được đăng ký";
          if (!formErrors.email || formErrors.email !== "Email này đã được đăng ký") {
            showAlert("Email này đã được đăng ký trong hệ thống", "error");
          }
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'phone':
        if (value && !validatePhone(value)) {
          newErrors.phone = "Số điện thoại phải có 10-11 số";
        } else if (value && checkPhoneExists(value)) {
          newErrors.phone = "Số điện thoại này đã được đăng ký";
          if (!formErrors.phone || formErrors.phone !== "Số điện thoại này đã được đăng ký") {
            showAlert("Số điện thoại này đã được đăng ký trong hệ thống", "error");
          }
        } else {
          delete newErrors.phone;
        }
        break;
        
      case 'department':
        if (!value) {
          newErrors.department = "Vui lòng chọn phòng ban";
        } else {
          delete newErrors.department;
        }
        break;
    }
    
    setFormErrors(newErrors);
    return !newErrors[field as keyof typeof newErrors];
  }

  // Check if a field is valid (for styling)
  const isFieldValid = (field: string): boolean => {
    switch(field) {
      case 'name':
        return formData.name.length > 0 && !formErrors.name;
      case 'email':
        return validateEmail(formData.email) && !formErrors.email;
      case 'phone':
        return !formData.phone || (validatePhone(formData.phone) && !formErrors.phone);
      case 'department':
        return !!formData.department && !formErrors.department;
      default:
        return false;
    }
  };

  // Check if the form is valid and ready to submit
  const isFormValid = (): boolean => {
    return isFieldValid('name') && 
           isFieldValid('email') && 
           (isFieldValid('phone') || !formData.phone) && 
           isFieldValid('department');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const nameValid = validateField('name', formData.name);
    const emailValid = validateField('email', formData.email);
    const phoneValid = validateField('phone', formData.phone);
    const departmentValid = validateField('department', formData.department);
    
    // Shake invalid fields
    setShakeFields({
      name: !nameValid,
      email: !emailValid,
      phone: !phoneValid,
      department: !departmentValid
    });
    
    // If any validation fails, don't submit and show a custom alert
    if (!nameValid || !emailValid || !phoneValid || !departmentValid) {
      showAlert("Vui lòng điền đầy đủ và chính xác thông tin", "warning");
      return;
    }

    // Show loading state
    setIsSubmitting(true);

    const newEmployeeId = generateEmployeeId()
    const uniqueCode = generateUniqueCode()

    const existingEmployees = JSON.parse(localStorage.getItem("employeeRegistrations") || "[]")
    // Kiểm tra mã không trùng lặp
    const codeExists = existingEmployees.some((emp: any) => emp.uniqueCode === uniqueCode)
    const employeeIdExists = existingEmployees.some((emp: any) => emp.id === newEmployeeId)

    if (codeExists || employeeIdExists) {
      // Tạo lại mã nếu trùng
      setIsSubmitting(false);
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

    try {
      existingEmployees.push(newEmployee)
      localStorage.setItem("employeeRegistrations", JSON.stringify(existingEmployees))

      setEmployeeId(newEmployeeId)
      setGeneratedQR(qrCodeData)

      // Show success alert
      showAlert("Đăng ký thành công! Đang tạo mã QR...", "success");
      
      // Gửi email sau khi đăng ký thành công
      await sendRegistrationEmail(newEmployee, qrCodeData, uniqueCode)
      
      // Complete the submission
      setIsSubmitted(true)
    } catch (error) {
      console.error("Error during registration:", error);
      showAlert("Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
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
    validateField(field, value);
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
                  <li>• Mã QR này là duy nhất và được sử dụng để xác thực danh tính của bạn</li>
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
      <style jsx global>{customStyles}</style>
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
              <div className="space-y-1">
                <Label htmlFor="name">Họ và tên *</Label>
                <div className="relative">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                    className={cn(
                      "pr-10 input-field",
                      shakeFields.name && "shake", 
                      formErrors.name && "border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500",
                      isFieldValid('name') && "input-valid"
                    )}
                  />
                  {isFieldValid('name') && (
                    <span className="absolute right-3 top-2.5 form-success-indicator">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </span>
                  )}
                </div>
                {formErrors.name && (
                  <div className="text-red-500 text-xs flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{formErrors.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="example@company.com"
                  required
                    className={cn(
                      "pr-10 input-field",
                      shakeFields.email && "shake", 
                      formErrors.email && "border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500",
                      isFieldValid('email') && "input-valid"
                    )}
                  />
                  {isFieldValid('email') && (
                    <span className="absolute right-3 top-2.5 form-success-indicator">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </span>
                  )}
                </div>
                {formErrors.email && (
                  <div className="text-red-500 text-xs flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{formErrors.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Số điện thoại</Label>
                <div className="relative">
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="0123456789"
                    className={cn(
                      "pr-10 input-field",
                      shakeFields.phone && "shake", 
                      formErrors.phone && "border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500",
                      isFieldValid('phone') && "input-valid"
                    )}
                  />
                  {isFieldValid('phone') && formData.phone && (
                    <span className="absolute right-3 top-2.5 form-success-indicator">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </span>
                  )}
                </div>
                {formErrors.phone && (
                  <div className="text-red-500 text-xs flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{formErrors.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="department">Phòng ban *</Label>
                <Select onValueChange={(value) => handleInputChange("department", value)}>
                  <SelectTrigger className={cn(
                    "input-field",
                    shakeFields.department && "shake", 
                    formErrors.department && "border-red-500 ring-1 ring-red-500 focus-visible:ring-red-500",
                    isFieldValid('department') && "input-valid"
                  )}>
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
                {formErrors.department && (
                  <div className="text-red-500 text-xs flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{formErrors.department}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Vị trí công việc</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  placeholder="Developer, Manager, ..."
                  className="input-field"
                />
              </div>

              <Button 
                type="submit" 
                className={cn(
                  "w-full mt-4 submit-button",
                  isFormValid() && !isSubmitting && "submit-button-ready"
                )}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    Đang xử lý...
                  </>
                ) : (
                  "Đăng ký và tạo mã QR"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
