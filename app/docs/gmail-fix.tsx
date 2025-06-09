"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Copy, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function GmailFixPage() {
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
            <CardTitle className="text-2xl">Khắc phục lỗi Gmail (535-5.7.8)</CardTitle>
            <CardDescription>
              Hướng dẫn khắc phục lỗi "Username and Password not accepted" khi sử dụng Gmail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-800 mb-2">Lỗi phổ biến:</p>
              <pre className="text-sm text-red-700 whitespace-pre-wrap bg-white p-3 rounded border border-red-100">
                Invalid login: 535-5.7.8 Username and Password not accepted. For more information, go to
                https://support.google.com/mail/?p=BadCredentials - gsmtp
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Nguyên nhân và giải pháp</h3>
              <p className="text-gray-700 mb-4">
                Lỗi này xảy ra vì Google đã tăng cường bảo mật và không cho phép các ứng dụng bên thứ 3 sử dụng mật khẩu thông thường. 
                Bạn <strong>phải sử dụng mật khẩu ứng dụng (App Password)</strong> thay vì mật khẩu tài khoản Google thông thường.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Các bước khắc phục:</h3>
              <ol className="space-y-6 list-decimal pl-6">
                <li>
                  <div>
                    <strong>Bật xác minh 2 bước</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Đây là bước bắt buộc trước khi có thể tạo mật khẩu ứng dụng.
                    </p>
                    <ol className="text-sm list-decimal pl-5 mt-2 space-y-1">
                      <li>Truy cập vào <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">Cài đặt bảo mật Google <ExternalLink className="w-3 h-3 ml-1" /></a></li>
                      <li>Tìm mục "Xác minh 2 bước" và nhấp vào "Bắt đầu" (nếu chưa bật)</li>
                      <li>Làm theo các bước xác minh bằng số điện thoại</li>
                      <li>Hoàn thành quá trình thiết lập xác minh 2 bước</li>
                    </ol>
                  </div>
                </li>

                <li>
                  <div>
                    <strong>Tạo mật khẩu ứng dụng (App Password)</strong>
                    <ol className="text-sm list-decimal pl-5 mt-2 space-y-1">
                      <li>Truy cập vào <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">Mật khẩu ứng dụng <ExternalLink className="w-3 h-3 ml-1" /></a> (yêu cầu đã bật xác minh 2 bước)</li>
                      <li>Chọn "Ứng dụng" là "Khác (tên tùy chỉnh)"</li>
                      <li>Nhập tên "Hệ thống chấm công" và nhấp "Tạo"</li>
                      <li>Google sẽ hiển thị mật khẩu ứng dụng gồm 16 ký tự</li>
                      <li>Sao chép mật khẩu này (không có dấu cách)</li>
                    </ol>
                  </div>
                </li>

                <li>
                  <div>
                    <strong>Cập nhật file .env.local</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Tạo hoặc chỉnh sửa file .env.local tại thư mục gốc dự án:
                    </p>
                    <div className="bg-gray-900 text-gray-200 p-3 rounded mt-2 flex justify-between items-center">
                      <pre className="text-sm">
                        <code>{`EMAIL_USER=your-real-gmail@gmail.com
EMAIL_PASSWORD=your16digitapppassword`}</code>
                      </pre>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`EMAIL_USER=your-real-gmail@gmail.com
EMAIL_PASSWORD=your16digitapppassword`)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-2">
                      <p className="text-yellow-800 text-sm">
                        <strong>Lưu ý:</strong> Thay <code>your-real-gmail@gmail.com</code> bằng địa chỉ Gmail của bạn và 
                        <code>your16digitapppassword</code> bằng mật khẩu ứng dụng 16 ký tự (không có dấu cách).
                      </p>
                    </div>
                  </div>
                </li>

                <li>
                  <div>
                    <strong>Khởi động lại server</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      Sau khi cập nhật file .env.local, bạn cần khởi động lại server để áp dụng thay đổi:
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
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-800 mb-2">Các vấn đề phổ biến khác:</h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>
                  <strong>Chưa cho phép ứng dụng kém an toàn:</strong> Nếu bạn gặp lỗi về "Less secure app", Google đã loại bỏ tùy chọn này. Bạn phải sử dụng mật khẩu ứng dụng.
                </li>
                <li>
                  <strong>Captcha yêu cầu:</strong> Nếu Gmail yêu cầu giải Captcha, hãy truy cập <a href="https://accounts.google.com/DisplayUnlockCaptcha" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">Unlock Captcha <ExternalLink className="w-3 h-3 ml-1" /></a> và đăng nhập bằng tài khoản Google.
                </li>
                <li>
                  <strong>Tài khoản Google Workspace:</strong> Nếu bạn sử dụng Google Workspace (G Suite), quản trị viên cần cho phép truy cập IMAP/SMTP trong cài đặt.
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => router.push('/docs/email-config')} variant="outline">
                Quay lại hướng dẫn cấu hình email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 