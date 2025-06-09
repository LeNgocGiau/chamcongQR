"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, UserPlus, Settings, Camera } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  const handleAdminLogin = () => {
    router.push("/admin/login")
  }

  const handleEmployeeRegister = () => {
    router.push("/employee/register")
  }

  const handleAttendanceCheck = () => {
    router.push("/attendance")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Hệ thống chấm công QR</CardTitle>
          <CardDescription>Chọn chức năng bạn muốn sử dụng</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleAttendanceCheck} className="w-full h-16 text-lg" size="lg">
            <Camera className="w-6 h-6 mr-3" />
            Chấm công ngay
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleEmployeeRegister} variant="outline" className="h-16">
              <UserPlus className="w-5 h-5 mr-2" />
              Đăng ký nhân viên
            </Button>
            <Button onClick={handleAdminLogin} variant="outline" className="h-16">
              <Settings className="w-5 h-5 mr-2" />
              Quản trị
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 mt-6">
            <p>• Nhân viên mới: Đăng ký → Nhận mã QR → Chờ duyệt</p>
            <p>• Nhân viên cũ: Quét mã QR cá nhân để chấm công</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
