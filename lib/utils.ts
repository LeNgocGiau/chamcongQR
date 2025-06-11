import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SalaryCalculationResult, BonusEntry } from './salaryCalculator'
import { formatDistance, subDays, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

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

// Format time for display (HH:MM)
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Format full time for display (HH:MM:SS)
export function formatFullTime(date: Date): string {
  const time = formatTime(date);
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${time}:${seconds}`;
}

// Format date for display (DD/MM/YYYY)
export function formatDateFormatted(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format date and time for display (DD/MM/YYYY HH:MM)
export function formatDateTimeFormatted(date: Date): string {
  return `${formatDateFormatted(date)} ${formatTime(date)}`;
}

// Format date and time for input fields (YYYY-MM-DD)
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate a unique ID
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Convert an array of objects to CSV
export function convertToCSV(objArray: any[]): string {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  let str = '';

  // Extract headers
  const headers = Object.keys(array[0]);
  str += headers.join(',') + '\r\n';

  // Add rows
  for (let i = 0; i < array.length; i++) {
    let line = '';
    for (let index in headers) {
      if (line !== '') line += ',';
      let value = array[i][headers[index]];
      // Handle values with commas by wrapping in quotes
      if (value !== null && value !== undefined) {
        const cellValue = value.toString();
        if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
          line += '"' + cellValue.replace(/"/g, '""') + '"';
        } else {
          line += cellValue;
        }
      } else {
        line += '';
      }
    }
    str += line + '\r\n';
  }
  return str;
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Format attendance records for CSV export
export function formatAttendanceRecordsForExport(records: any[]): any[] {
  return records.map(record => ({
    'ID': record.id,
    'Mã nhân viên': record.employeeId,
    'Tên nhân viên': record.employeeName,
    'Loại': record.type === 'check-in' ? 'Vào' : 'Ra',
    'Thời gian': new Date(record.timestamp).toLocaleString('vi-VN'),
    'Địa điểm': record.location || 'N/A'
  }));
}

// Format employee stats for CSV export
export function formatEmployeeStatsForExport(stats: any[]): any[] {
  return stats.map(stat => ({
    'Mã nhân viên': stat.employeeId,
    'Tên nhân viên': stat.employeeName,
    'Tổng giờ làm': `${Math.floor(stat.totalMinutes / 60)}h ${stat.totalMinutes % 60}m`,
    'Số ngày làm': stat.daysWorked
  }));
}

// Format salary data for CSV export
export function formatSalaryDataForExport(
  salaryData: SalaryCalculationResult[],
  bonusData?: Record<string, BonusEntry>
): any[] {
  return salaryData.map(salary => {
    const baseAmount = salary.regularAmount + salary.overtimeAmount + salary.weekendAmount + salary.paidLeaveAmount;
    
    return {
      'Mã nhân viên': salary.employeeId,
      'Tên nhân viên': salary.employeeName,
      'Giờ làm thường': `${salary.regularHours}h ${salary.regularMinutes}p`,
      'Giờ tăng ca': `${salary.overtimeHours}h ${salary.overtimeMinutes}p`,
      'Giờ cuối tuần': `${salary.weekendHours}h ${salary.weekendMinutes}p`,
      'Nghỉ phép': `${salary.paidLeaveHours}h`,
      'Số ngày làm': salary.daysWorked,
      'Giờ TB/ngày': salary.avgDailyHours.toFixed(1),
      'Lương cơ bản': formatCurrency(baseAmount),
      'Thưởng': formatCurrency(salary.bonusAmount),
      'Lý do thưởng': bonusData?.[salary.employeeId]?.reason || '',
      'Tổng lương': formatCurrency(salary.totalAmount),
      'Kỳ lương': `${new Date(salary.periodStart).toLocaleDateString('vi-VN')} - ${new Date(salary.periodEnd).toLocaleDateString('vi-VN')}`
    }
  });
}
