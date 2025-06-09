import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for reports
export const generateUniqueCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
}

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("vi-VN")
}

export const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString("vi-VN")
}

export const calculateWorkingHours = (checkIn: string, checkOut: string) => {
  const checkInTime = new Date(checkIn)
  const checkOutTime = new Date(checkOut)
  const diffMs = checkOutTime.getTime() - checkInTime.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return Math.round(diffHours * 100) / 100
}

export const isLateCheckIn = (checkInTime: string, standardTime = "08:00") => {
  const checkIn = new Date(checkInTime)
  const [hours, minutes] = standardTime.split(":").map(Number)
  const standard = new Date(checkIn)
  standard.setHours(hours, minutes, 0, 0)

  return checkIn > standard
}

export const isEarlyCheckOut = (checkOutTime: string, standardTime = "17:00") => {
  const checkOut = new Date(checkOutTime)
  const [hours, minutes] = standardTime.split(":").map(Number)
  const standard = new Date(checkOut)
  standard.setHours(hours, minutes, 0, 0)

  return checkOut < standard
}
