"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function EmailConfigPage() {
  const router = useRouter()
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Sao chép thành công",
          description: "Đã sao chép vào clipboard",
        })
      },
      (err) => {
        console.error("Không thể sao chép: ", err)
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Hướng dẫn cấu hình email</CardTitle>
            <CardDescription>
              Cách thiết lập email thật để gửi thông báo đến người đăng ký
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Vấn đề hiện tại</h3>
              <p>
                Hiện tại, hệ thống đang sử dụng <strong>Ethereal Email</strong> - một dịch vụ email giả lập
                để test. Điều này có nghĩa là email không thực sự được gửi đến địa chỉ người nhận.
              </p>
              <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4">
                <p className="text-yellow-800 text-sm">
                  Khi sử dụng Ethereal, bạn có thể nhấp vào liên kết "Xem email mẫu" để xem nội dung email,
                  nhưng người dùng thật sẽ không nhận được email.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Cách cấu hình email Gmail</h3>
              <ol className="space-y-6 list-decimal pl-6">
                <li>
                  <div>
                    <strong>Bật xác minh 2 bước cho tài khoản Google của bạn</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Truy cập{" "}
                      <a
                        href="https://myaccount.google.com/security"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Cài đặt bảo mật Google
                      </a>{" "}
                      và bật "Xác minh 2 bước"
                    </p>
                  </div>
                </li>

                <li>
                  <div>
                    <strong>Tạo mật khẩu ứng dụng</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Truy cập{" "}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Mật khẩu ứng dụng
                      </a>{" "}
                      và tạo mật khẩu mới cho "Ứng dụng khác" với tên "Hệ thống chấm công"
                    </p>
                    <div className="bg-gray-100 p-2 rounded mt-2">
                      <p className="text-sm text-gray-800">
                        Google sẽ cung cấp mật khẩu gồm 16 ký tự không có dấu cách. Hãy lưu lại mật khẩu này.
                      </p>
                    </div>
                  </div>
                </li>

                <li>
                  <div>
                    <strong>Tạo file .env.local</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Tạo file .env.local tại thư mục gốc của dự án với nội dung sau:
                    </p>
                    <div className="bg-gray-900 text-gray-200 p-3 rounded mt-2 flex justify-between items-center">
                      <pre className="text-sm">
                        <code>{`EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password`}</code>
                      </pre>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password`)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Thay your-email@gmail.com bằng địa chỉ Gmail của bạn và your-app-password bằng mật khẩu ứng dụng từ bước 2.
                    </p>
                  </div>
                </li>

                <li>
                  <div>
                    <strong>Khởi động lại server</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Dừng server hiện tại và khởi động lại bằng lệnh:
                    </p>
                    <div className="bg-gray-900 text-gray-200 p-3 rounded mt-2 flex justify-between items-center">
                      <pre className="text-sm">
                        <code>npm run dev</code>
                      </pre>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard("npm run dev")}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              </ol>

              <div className="bg-green-50 border border-green-100 rounded-md p-4 mt-6">
                <p className="text-green-800 text-sm">
                  <strong>Lưu ý:</strong> Sau khi cấu hình, email sẽ được gửi thực sự đến địa chỉ người nhận.
                  Giao diện sẽ hiển thị thông báo "Email thật đã được gửi" thay vì "Email giả lập".
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mt-2">
                <p className="text-blue-800 text-sm">
                  <strong>Kiểm tra thư mục SPAM:</strong> Đôi khi, email tự động có thể bị đánh dấu là SPAM.
                  Hãy kiểm tra thư mục SPAM nếu không thấy email trong hộp thư đến.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
                <p className="text-yellow-800 text-sm font-medium">Gặp lỗi "535-5.7.8 Username and Password not accepted"?</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Nếu bạn gặp lỗi xác thực Gmail, xem hướng dẫn chi tiết tại:
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-2 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                  onClick={() => router.push('/docs/gmail-fix')}
                >
                  Xem hướng dẫn khắc phục Gmail
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 