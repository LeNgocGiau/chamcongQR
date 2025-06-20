"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Camera, CameraOff, RefreshCcw, Monitor } from "lucide-react"
import jsQR from "jsqr"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type CameraStatus = "idle" | "loading" | "scanning" | "error" | "stopped"

interface QrScannerProps {
  onScan: (data: string) => void
}

export function QrScanner({ onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<CameraStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>("")
  const streamRef = useRef<MediaStream | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoStats, setVideoStats] = useState<{width: number, height: number} | null>(null)
  const debugTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const scanButtonRef = useRef<HTMLButtonElement>(null)

  // Function to release camera and clear resources
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      console.log("Stopping all tracks for stream:", streamRef.current.id)
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log("Track stopped:", track.label, track.id)
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      const video = videoRef.current
      // Remove all event listeners
      video.onloadedmetadata = null
      video.onloadeddata = null
      video.onerror = null
      video.onplaying = null
      // Clear source
      video.srcObject = null
      video.src = ""
      // Reset video properties
      try {
        video.load()
      } catch (e) {
        console.log("Error resetting video:", e)
      }
    }
    
    if (debugTimeoutRef.current) {
      clearInterval(debugTimeoutRef.current)
      debugTimeoutRef.current = null
    }
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    
    setCountdown(null)
    setVideoLoaded(false)
    setVideoStats(null)
    setStatus("stopped")
    console.log("Camera stopped and resources released.")
  }, [])

  const listCameras = useCallback(async () => {
    try {
      console.log("Listing cameras...")
      setError(null)
      setStatus("loading")
      
      // Trước tiên, đảm bảo không có camera nào đang hoạt động
      stopCamera()
      
      // Yêu cầu quyền
      try {
        // Yêu cầu quyền một lần rồi giải phóng ngay
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        tempStream.getTracks().forEach(track => {
          track.stop()
          console.log("Permission check track stopped:", track.label)
        })
      } catch (err) {
        console.error("Lỗi khi yêu cầu quyền camera:", err)
        setError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.")
        setStatus("error")
        return
      }
      
      // Đợi một chút để camera được giải phóng
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Liệt kê các thiết bị
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")

      console.log("Found cameras:", videoDevices)
      setCameras(videoDevices)

      if (videoDevices.length > 0) {
        const realCameras = videoDevices.filter(
          (cam) => !/virtual|vmix|obs|droidcam|manycam/i.test(cam.label),
        )
        if (realCameras.length > 0) {
          setSelectedCamera(realCameras[0].deviceId)
          console.log("Auto-selected real camera:", realCameras[0].label)
        } else {
          setSelectedCamera(videoDevices[0].deviceId)
          console.log("Auto-selected first available camera:", videoDevices[0].label)
        }
        setStatus("idle")
      } else {
        setError("Không tìm thấy camera nào.")
        setStatus("error")
      }
    } catch (e: any) {
      console.error("Failed to list cameras:", e)
      setError("Không thể liệt kê camera. Vui lòng kiểm tra quyền truy cập.")
      setStatus("error")
    }
  }, [stopCamera])

  // Function to capture and scan QR code on button press
  const captureAndScanQR = useCallback(() => {
    console.log("captureAndScanQR called")
    if (!videoRef.current || !canvasRef.current || status !== "scanning") {
      console.log("Early return: video not ready or status not scanning", { 
        videoRef: !!videoRef.current, 
        canvasRef: !!canvasRef.current, 
        status 
      })
      return
    }
    
    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Kiểm tra video đã sẵn sàng chưa
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log("Video not ready: readyState =", video.readyState)
      setError("Video chưa sẵn sàng. Vui lòng đợi...")
      return
    }
    
    // Kích thước của video
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    
    if (videoWidth === 0 || videoHeight === 0) {
      console.log("Invalid video dimensions:", videoWidth, "x", videoHeight)
      setError("Không có khung hình hợp lệ")
      return
    }

    console.log("Capturing frame with dimensions:", videoWidth, "x", videoHeight)
    
    // Set canvas dimensions
    canvas.width = videoWidth
    canvas.height = videoHeight

    // Draw video frame to canvas
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (ctx) {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw video
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Scan for QR code
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          })
          if (code) {
            console.log("QR code found:", code.data)
            // First stop camera
            stopCamera()
            // Send data to parent component
            console.log("Sending QR data to parent component:", code.data)
            onScan(code.data)
            return
          } else {
            console.log("No QR code found in image")
            setError("Không tìm thấy mã QR trong hình. Vui lòng thử lại.")
          }
        } catch (err) {
          console.error("QR scan error:", err)
          setError("Lỗi khi quét mã QR. Vui lòng thử lại.")
        }
      } catch (err) {
        console.error("Canvas draw error:", err)
        setError("Lỗi khi xử lý hình ảnh. Vui lòng thử lại.")
      }
    }
  }, [onScan, status, stopCamera])

  // Start countdown timer when camera is ready
  const startCountdownTimer = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    
    // Give the camera a moment to initialize before starting countdown
    setTimeout(() => {
      console.log("Starting countdown timer")
      setCountdown(4)
      
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          console.log("Countdown:", prev)
          if (prev === null || prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current)
              countdownRef.current = null
            }
            
            // Auto capture QR when countdown reaches 0
            if (prev === 1) {
              console.log("Countdown complete - triggering QR scan")
              // Use a small delay to ensure state updates are complete
              setTimeout(() => {
                // Either click the button or call the function directly
                if (scanButtonRef.current) {
                  console.log("Clicking scan button via ref")
                  scanButtonRef.current.click()
                } else {
                  console.log("Calling captureAndScanQR directly")
                  captureAndScanQR()
                }
              }, 100)
            }
            
            return null
          }
          return prev - 1
        })
      }, 1000)
    }, 500) // Short delay to ensure camera is initialized
  }, [captureAndScanQR])

  // Function to monitor video element status
  const startVideoMonitoring = useCallback(() => {
    if (debugTimeoutRef.current) {
      clearInterval(debugTimeoutRef.current)
    }
    
    debugTimeoutRef.current = setInterval(() => {
      if (videoRef.current && status === "scanning") {
        const video = videoRef.current
        console.log("Video monitor - readyState:", video.readyState)
        console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight)
        console.log("Video paused:", video.paused, "ended:", video.ended)
        
        // Update video stats for display
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoStats({
            width: video.videoWidth,
            height: video.videoHeight
          })
        }
        
        // If video is stuck, try to recover
        if (video.videoWidth === 0 && video.videoHeight === 0 && video.readyState >= 2) {
          console.log("Video seems stuck. Attempting to recover...")
          if (video.paused) {
            video.play().catch(e => console.log("Play recovery failed:", e))
          }
        }
      }
    }, 3000)
  }, [status])

  const startCamera = useCallback(async () => {
    if (status === "scanning") {
      stopCamera()
      return
    }

    if (!selectedCamera) {
      setError("Vui lòng chọn camera.")
      setStatus("error")
      return
    }

    console.log(`Attempting to start camera: ${selectedCamera}`)
    setStatus("loading")
    setError(null)
    setVideoLoaded(false)
    setVideoStats(null)
    
    // Reset video element
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null
        videoRef.current.load()
      } catch (e) {
        // Ignore errors
      }
    }

    try {
      // Đợi camera được giải phóng hoàn toàn
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const constraints = {
        video: { 
          deviceId: { exact: selectedCamera },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      console.log("Requesting media with constraints:", constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints)
      console.log("Successfully obtained media stream with tracks:", stream.getVideoTracks().map(t => t.label))
      
      // Store stream
      streamRef.current = stream

      if (videoRef.current) {
        const video = videoRef.current
        
        // Set up event handlers before assigning srcObject
        video.onloadedmetadata = () => {
          console.log("Video metadata loaded")
          setVideoLoaded(true)
          video.play()
            .then(() => {
              console.log("Video playback started")
              setStatus("scanning")
              startVideoMonitoring()
              startCountdownTimer()
            })
            .catch(err => {
              console.error("Play error:", err)
              setError("Không thể phát video: " + err.message)
              setStatus("error")
            })
        }
        
        video.onloadeddata = () => {
          console.log("Video data loaded")
        }
        
        video.onerror = (e) => {
          console.error("Video error:", e)
          setError("Lỗi video: " + (video.error?.message || "Không xác định"))
          setStatus("error")
        }
        
        video.onplaying = () => {
          console.log("Video started playing")
          setVideoLoaded(true)
        }
        
        // Finally set the srcObject (after event handlers)
        video.srcObject = stream
        video.setAttribute("playsinline", "true")
        video.setAttribute("autoplay", "true")
        video.muted = true
      } else {
        throw new Error("Video element not found")
      }
    } catch (err: any) {
      console.error("Error starting camera:", err.name, err.message)
      let friendlyError = "Không thể khởi động camera."
      
      if (err.name === "NotReadableError" || err.message?.includes("in use")) {
        friendlyError =
          "Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng đó và thử lại."
      } else if (err.name === "NotAllowedError") {
        friendlyError =
          "Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt."
      } else if (err.name === "NotFoundError") {
        friendlyError = "Không tìm thấy camera đã chọn. Có thể nó đã bị ngắt kết nối."
      } else if (err.name === "OverconstrainedError") {
        friendlyError = "Camera không hỗ trợ độ phân giải yêu cầu. Đang thử lại với cài đặt thấp hơn."
        
        // Thử lại với ít ràng buộc hơn
        try {
          const simpleConstraints = {
            video: { deviceId: { exact: selectedCamera } },
            audio: false
          }
          
          console.log("Retrying with simpler constraints:", simpleConstraints)
          const stream = await navigator.mediaDevices.getUserMedia(simpleConstraints)
          streamRef.current = stream
          
          if (videoRef.current) {
            const video = videoRef.current
            
            video.onloadedmetadata = () => {
              console.log("Video metadata loaded (retry)")
              video.play()
                .then(() => {
                  console.log("Video playback started (retry)")
                  setVideoLoaded(true)
                  setStatus("scanning")
                  startVideoMonitoring()
                  startCountdownTimer()
                })
                .catch(playErr => {
                  console.error("Play error (retry):", playErr)
                  setError("Không thể phát video (thử lại): " + playErr.message)
                  setStatus("error")
                  stopCamera()
                })
            }
            
            // Các event khác
            video.onloadeddata = () => console.log("Video data loaded (retry)")
            video.onerror = (e) => {
              console.error("Video error (retry):", e)
              setError("Lỗi video (thử lại): " + (video.error?.message || "Không xác định"))
              setStatus("error")
              stopCamera()
            }
            
            video.srcObject = stream
            video.setAttribute("playsinline", "true")
            video.setAttribute("autoplay", "true")
            video.muted = true
            
            // Đã thử lại thành công
            return
          }
        } catch (retryErr) {
          console.error("Retry failed:", retryErr)
          friendlyError += " Thử lại thất bại."
        }
      }
      
      setError(friendlyError)
      setStatus("error")
      stopCamera()
    }
  }, [selectedCamera, status, stopCamera, startVideoMonitoring, startCountdownTimer])

  useEffect(() => {
    listCameras()
    return () => {
      stopCamera()
    }
  }, [listCameras, stopCamera])

  const handleRefresh = () => {
    stopCamera()
    listCameras()
  }

  const forcePlayVideo = () => {
    if (videoRef.current) {
      console.log("Forcing video playback...")
      videoRef.current.play()
        .then(() => console.log("Force play succeeded"))
        .catch(err => console.log("Force play failed:", err))
    }
  }

  const isLoading = status === "loading"
  const isScanning = status === "scanning"

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
        <video 
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            !isScanning && "hidden"
          )}
          autoPlay 
          playsInline 
          muted 
        />
        
        {!isScanning && (
          <div className="w-full h-full flex items-center justify-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            ) : (
              <CameraOff className="w-12 h-12 text-gray-400" />
            )}
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4 gap-4">
            <p className="text-red-400 whitespace-pre-line">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Làm mới
              </Button>
              {isScanning && (
                <Button onClick={forcePlayVideo} variant="outline" size="sm">
                  <Monitor className="w-4 h-4 mr-2" />
                  Bật lại video
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Countdown timer overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-6xl font-bold text-white bg-black/70 rounded-full w-24 h-24 flex items-center justify-center">
              {countdown}
            </div>
          </div>
        )}
        
        {/* Scanning overlay */}
        <div className="absolute inset-0 border-2 border-white/30 rounded-lg pointer-events-none">
          <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white"></div>
          <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-white"></div>
          <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-white"></div>
          <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white"></div>
        </div>
        
        {/* Video Dimensions */}
        {videoStats && isScanning && (
          <div className="absolute top-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
            {videoStats.width}x{videoStats.height}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {cameras.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={selectedCamera}
              onValueChange={setSelectedCamera}
              disabled={isLoading || isScanning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn camera" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading}>
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </div>
          {selectedCamera &&
            cameras
              .find((c) => c.deviceId === selectedCamera)
              ?.label.toLowerCase()
              .match(/virtual|vmix|obs|droidcam|manycam/) && (
              <p className="text-xs text-amber-600">
                Lưu ý: Camera ảo có thể không hoạt động. Vui lòng chọn camera thật nếu có.
              </p>
            )}
        </div>
      )}

      <div className="space-y-2">
        <Button onClick={startCamera} className="w-full" disabled={isLoading || !selectedCamera}>
          {isScanning ? (
            <>
              <CameraOff className="w-4 h-4 mr-2" />
              Tắt Camera
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Bật Camera
            </>
          )}
        </Button>

        {isScanning && (
          <Button 
            ref={scanButtonRef}
            onClick={captureAndScanQR} 
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            Chụp để quét mã QR
            {countdown !== null && " (tự động sau " + countdown + "s)"}
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        {countdown !== null 
          ? "Hệ thống sẽ tự động quét sau " + countdown + " giây" 
          : "Đưa mã QR vào khung hình và bấm nút chụp để quét"}
      </p>
    </div>
  )
}

