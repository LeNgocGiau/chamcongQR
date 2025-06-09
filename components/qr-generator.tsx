"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Clock } from "lucide-react"

export function QrGenerator() {
  const [qrData, setQrData] = useState("")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [qrUrl, setQrUrl] = useState("")

  useEffect(() => {
    generateNewQR()
    const interval = setInterval(generateNewQR, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 300 // Reset to 5 minutes
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const generateNewQR = () => {
    const data = {
      timestamp: new Date().toISOString(),
      location: "Văn phòng chính",
      company: "ABC Company",
      id: Math.random().toString(36).substr(2, 9),
    }

    const qrString = JSON.stringify(data)
    setQrData(qrString)

    // Generate QR code URL using a QR code API
    const encodedData = encodeURIComponent(qrString)
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`)
    setTimeLeft(300)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            <span className="text-sm">Thời gian còn lại:</span>
            <Badge variant="outline">{formatTime(timeLeft)}</Badge>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
            {qrUrl ? (
              <img
                src={qrUrl || "/placeholder.svg"}
                alt="QR Code"
                className="w-64 h-64 mx-auto"
                onError={() => {
                  // Fallback to a simple QR representation
                  console.log("QR image failed to load")
                }}
              />
            ) : (
              <div className="w-64 h-64 bg-gray-100 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">Mã QR này sẽ tự động làm mới sau {formatTime(timeLeft)}</p>
            <p className="text-xs text-gray-500">Nhân viên quét mã này để chấm công</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Thông tin mã QR:</h4>
          <div className="text-xs bg-gray-50 p-3 rounded font-mono break-all">{qrData}</div>
        </CardContent>
      </Card>
    </div>
  )
}
