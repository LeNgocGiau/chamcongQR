export interface AttendanceRecord {
  id: string
  employeeId: string
  type: "check-in" | "check-out"
  timestamp: string
  location?: string
}

export interface Employee {
  id: string
  name: string
  department: string
  position?: string
}

export const sampleEmployees: Employee[] = [
  { id: "NV001", name: "Nguyễn Văn An", department: "IT" },
  { id: "NV002", name: "Trần Thị Bình", department: "HR" },
  { id: "NV003", name: "Lê Văn Cường", department: "Marketing" },
  { id: "NV004", name: "Phạm Thị Dung", department: "Finance" },
  { id: "NV005", name: "Hoàng Văn Em", department: "IT" },
]

// Initialize sample data if not exists
export const initializeSampleData = () => {
  if (typeof window !== "undefined") {
    const existingEmployees = localStorage.getItem("employees")
    if (!existingEmployees) {
      localStorage.setItem("employees", JSON.stringify(sampleEmployees))
    }

    const existingRecords = localStorage.getItem("attendanceRecords")
    if (!existingRecords) {
      localStorage.setItem("attendanceRecords", JSON.stringify([]))
    }
  }
}

export const getAttendanceRecords = (): AttendanceRecord[] => {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem("attendanceRecords") || "[]")
  }
  return []
}

export const saveAttendanceRecord = (record: AttendanceRecord) => {
  if (typeof window !== "undefined") {
    const records = getAttendanceRecords()
    records.push(record)
    localStorage.setItem("attendanceRecords", JSON.stringify(records))
  }
}

export const getEmployees = (): Employee[] => {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem("employees") || "[]")
  }
  return []
}

export const saveEmployee = (employee: Employee) => {
  if (typeof window !== "undefined") {
    const employees = getEmployees()
    employees.push(employee)
    localStorage.setItem("employees", JSON.stringify(employees))
  }
}
