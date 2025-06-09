"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save } from "lucide-react"

export default function AdminSettingsPage() {
  const [emailSettings, setEmailSettings] = useState({
    emailUser: process.env.NEXT_PUBLIC_EMAIL_USER || "",
    emailPassword: "",
  })
  
  const router = useRouter()

  const handleSaveEmailSettings = () => {
    // In a real application, this would update environment variables or database settings
    // For this demo, we'll just show an alert
    alert("Email settings saved!")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/admin")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold">Cài đặt hệ thống</h1>
        </div>

        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="general">Cài đặt chung</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt Email</CardTitle>
                <CardDescription>
                  Cấu hình email để gửi thông báo và thông tin đăng ký cho người dùng
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailUser">Email người gửi</Label>
                    <Input
                      id="emailUser"
                      placeholder="your-email@gmail.com"
                      value={emailSettings.emailUser}
                      onChange={(e) => setEmailSettings({ ...emailSettings, emailUser: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">Bạn cần sử dụng một tài khoản Gmail</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emailPassword">Mật khẩu ứng dụng</Label>
                    <Input
                      id="emailPassword"
                      type="password"
                      placeholder="App Password"
                      value={emailSettings.emailPassword}
                      onChange={(e) => setEmailSettings({ ...emailSettings, emailPassword: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Bạn cần tạo mật khẩu ứng dụng trong Gmail. 
                      <a 
                        href="https://support.google.com/accounts/answer/185833" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline ml-1"
                      >
                        Xem hướng dẫn
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">Hướng dẫn cấu hình email:</h3>
                  <ol className="text-sm text-yellow-700 space-y-2 list-decimal pl-5">
                    <li>Đảm bảo đã bật xác minh 2 bước cho tài khoản Google của bạn</li>
                    <li>Tạo mật khẩu ứng dụng trong cài đặt bảo mật Google</li>
                    <li>Sử dụng mật khẩu ứng dụng thay vì mật khẩu thông thường</li>
                    <li>Trong môi trường thực tế, bạn sẽ lưu những thông tin này vào file .env.local</li>
                    <li>File .env.local nên được thêm vào .gitignore để bảo mật thông tin</li>
                  </ol>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveEmailSettings}>
                    <Save className="w-4 h-4 mr-2" />
                    Lưu cài đặt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt chung</CardTitle>
                <CardDescription>Cấu hình chung cho hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Chức năng đang phát triển...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 