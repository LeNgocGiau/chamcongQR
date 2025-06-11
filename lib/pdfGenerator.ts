// PDF Generator sử dụng jsPDF
import { jsPDF } from 'jspdf';
// Import jspdf-autotable 
import autoTable from 'jspdf-autotable';
import { SalaryCalculationResult, SalaryConfig } from './salaryCalculator';

// Type cho thông tin header
interface HeaderInfo {
  label: string;
  value: string;
}

// Hàm tạo PDF chung
export const createAttendanceReport = (
  title: string,
  headerInfo: HeaderInfo[],
  tableHeaders: string[],
  tableData: any[],
  filename: string
) => {
  try {
    // Tạo document mới
    const doc = new jsPDF();

    // Thiết lập font mặc định
    doc.setFont("helvetica");
    
    // Tiêu đề
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text(title, 105, 20, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Thông tin header
    doc.setFontSize(10);
    let yPos = 30;
    
    headerInfo.forEach(info => {
      doc.text(`${info.label}: ${info.value}`, 14, yPos);
      yPos += 7;
    });
    
    // Tạo bảng với AutoTable - sử dụng hàm autoTable
    autoTable(doc, {
      startY: yPos + 5,
      head: [tableHeaders],
      body: tableData.map(row => Object.values(row)),
      theme: 'grid',
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 15 }, // STT
      }
    });
    
    // Lưu PDF
    doc.save(filename);
  } catch (error) {
    console.error('Lỗi khi tạo PDF:', error);
  }
};

// Tạo PDF cho báo cáo đã lọc
export const createFilteredReport = (
  filteredStats: any[],
  filterInfo: HeaderInfo[],
  filename: string
) => {
  // Tên cột cho bảng
  const tableHeaders = ['STT', 'Mã NV', 'Tên nhân viên', 'Tổng giờ làm', 'Số ngày làm'];
  
  // Chuyển đổi dữ liệu cho bảng
  const tableData = filteredStats.map((stat, index) => {
    return {
      stt: (index + 1).toString(),
      employeeId: stat.employeeId,
      employeeName: stat.employeeName,
      totalHours: `${Math.floor(stat.totalMinutes / 60)}h ${stat.totalMinutes % 60}m`,
      daysWorked: stat.daysWorked.toString()
    };
  });
  
  // Gọi hàm tạo báo cáo chung
  createAttendanceReport(
    'BÁO CÁO CHẤM CÔNG CHI TIẾT (ĐÃ LỌC)',
    filterInfo,
    tableHeaders,
    tableData,
    filename
  );
};

// Tạo PDF cho báo cáo chấm công chi tiết
export const createDetailedReport = (
  records: any[],
  reportInfo: HeaderInfo[],
  filename: string
) => {
  // Tên cột cho bảng
  const tableHeaders = ['STT', 'Mã NV', 'Tên nhân viên', 'Loại', 'Thời gian', 'Địa điểm'];
  
  // Chuyển đổi dữ liệu cho bảng
  const tableData = records.map((record, index) => {
    return {
      stt: (index + 1).toString(),
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      type: record.type === 'check-in' ? 'Vào' : 'Ra',
      timestamp: new Date(record.timestamp).toLocaleTimeString('vi-VN'),
      location: (record.location || 'N/A').substring(0, 20)
    };
  });
  
  // Gọi hàm tạo báo cáo chung
  createAttendanceReport(
    'BÁO CÁO CHẤM CÔNG CHI TIẾT',
    reportInfo,
    tableHeaders,
    tableData,
    filename
  );
};

// Hàm định dạng tiền tệ sang VND
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Tạo PDF báo cáo lương
export const createSalaryReport = (
  salaryData: SalaryCalculationResult[],
  salaryConfig: SalaryConfig,
  startDate: string,
  endDate: string,
  totalEmployees: number,
  departments: string[] = []
) => {
  // Tạo thông tin báo cáo
  const reportInfo: HeaderInfo[] = [
    { label: "Kỳ lương", value: `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}` },
    { label: "Tổng nhân viên", value: totalEmployees.toString() },
    { label: "Nhân viên được tính lương", value: salaryData.length.toString() },
    { label: "Ngày xuất báo cáo", value: new Date().toLocaleDateString('vi-VN') }
  ];
  
  // Nếu có lọc theo phòng ban
  if (departments.length > 0) {
    reportInfo.push({ label: "Phòng ban", value: departments.join(", ") });
  }
  
  // Tên cột cho bảng lương
  const tableHeaders = ['STT', 'Mã NV', 'Tên nhân viên', 'Giờ làm thường', 'Giờ tăng ca', 
                       'Giờ cuối tuần', 'Nghỉ phép', 'Số ngày làm', 'Giờ TB/ngày',
                       'Lương cơ bản', 'Thưởng', 'Tổng lương'];
  
  // Chuyển đổi dữ liệu lương cho bảng
  const tableData = salaryData.map((salary, index) => {
    const baseAmount = salary.regularAmount + salary.overtimeAmount + salary.weekendAmount + salary.paidLeaveAmount;
    
    return {
      stt: (index + 1).toString(),
      employeeId: salary.employeeId,
      employeeName: salary.employeeName,
      regularHours: `${salary.regularHours}h ${salary.regularMinutes}p`,
      overtimeHours: `${salary.overtimeHours}h ${salary.overtimeMinutes}p`,
      weekendHours: `${salary.weekendHours}h ${salary.weekendMinutes}p`,
      paidLeave: `${salary.paidLeaveHours}h`,
      daysWorked: salary.daysWorked.toString(),
      avgDailyHours: salary.avgDailyHours.toFixed(1) + "h",
      baseAmount: formatCurrency(baseAmount),
      bonusAmount: formatCurrency(salary.bonusAmount),
      totalAmount: formatCurrency(salary.totalAmount)
    };
  });
  
  // Tính tổng lương
  const totalBaseAmount = salaryData.reduce((sum, salary) => 
    sum + salary.regularAmount + salary.overtimeAmount + salary.weekendAmount + salary.paidLeaveAmount, 0);
  const totalBonusAmount = salaryData.reduce((sum, salary) => sum + salary.bonusAmount, 0);
  const totalAmount = salaryData.reduce((sum, salary) => sum + salary.totalAmount, 0);
  
  // Thêm dòng tổng vào cuối
  tableData.push({
    stt: "",
    employeeId: "",
    employeeName: `TỔNG CỘNG (${salaryData.length} nhân viên)`,
    regularHours: "",
    overtimeHours: "",
    weekendHours: "",
    paidLeave: "",
    daysWorked: "",
    avgDailyHours: "",
    baseAmount: formatCurrency(totalBaseAmount),
    bonusAmount: formatCurrency(totalBonusAmount),
    totalAmount: formatCurrency(totalAmount)
  });
  
  // Tạo tên file nếu chưa có
  const filename = `salary-report-${startDate}-to-${endDate}.pdf`;
  
  // Gọi hàm tạo báo cáo chung
  createAttendanceReport(
    'BÁO CÁO LƯƠNG NHÂN VIÊN',
    reportInfo,
    tableHeaders,
    tableData,
    filename
  );
};

// Tạo PDF báo cáo lương chi tiết cho một nhân viên
export const createEmployeeSalaryDetailReport = (
  salary: SalaryCalculationResult
) => {
  // Tạo thông tin về mức lương
  const salaryRateInfo: HeaderInfo[] = [
    { label: "Mức lương giờ", value: formatCurrency(salary.regularAmount / (salary.regularHours * 60 + salary.regularMinutes) * 60) },
    { label: "Hệ số tăng ca", value: `${salary.overtimeAmount / salary.regularAmount * (salary.regularHours * 60 + salary.regularMinutes) / (salary.overtimeHours * 60 + salary.overtimeMinutes)}x` },
    { label: "Hệ số cuối tuần", value: `${salary.weekendAmount / salary.regularAmount * (salary.regularHours * 60 + salary.regularMinutes) / (salary.weekendHours * 60 + salary.weekendMinutes)}x` },
    { label: "Hệ số phép có lương", value: `${salary.paidLeaveAmount / (salary.paidLeaveHours * 60) / (salary.regularAmount / (salary.regularHours * 60 + salary.regularMinutes))}x` }
  ];
  
  // Tạo thông tin báo cáo
  const reportInfo: HeaderInfo[] = [
    { label: "Kỳ lương", value: `${new Date(salary.periodStart).toLocaleDateString('vi-VN')} - ${new Date(salary.periodEnd).toLocaleDateString('vi-VN')}` },
    { label: "Ngày tạo", value: new Date().toLocaleDateString('vi-VN') },
    { label: "Số ngày làm việc", value: salary.daysWorked.toString() },
    { label: "Giờ trung bình/ngày", value: `${salary.avgDailyHours.toFixed(1)}h` }
  ];
  
  // Tạo tên file
  const filename = `salary-detail-${salary.employeeId}-${salary.periodStart}.pdf`;
  
  const doc = new jsPDF();
  
  // Thiết lập font mặc định
  doc.setFont("helvetica");
  
  // Tiêu đề
  doc.setFontSize(18);
  doc.setTextColor(0, 51, 102);
  doc.text('PHIẾU LƯƠNG CHI TIẾT', 105, 20, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // Thông tin nhân viên
  doc.setFontSize(12);
  let yPos = 30;
  doc.text(`Nhân viên: ${salary.employeeName}`, 14, yPos);
  yPos += 7;
  doc.text(`Mã nhân viên: ${salary.employeeId}`, 14, yPos);
  yPos += 7;
  doc.text(`Kỳ lương: ${new Date(salary.periodStart).toLocaleDateString('vi-VN')} - ${new Date(salary.periodEnd).toLocaleDateString('vi-VN')}`, 14, yPos);
  yPos += 7;
  doc.text(`Số ngày làm việc: ${salary.daysWorked}`, 14, yPos);
  yPos += 7;
  doc.text(`Giờ trung bình/ngày: ${salary.avgDailyHours.toFixed(1)}h`, 14, yPos);
  yPos += 12;
  
  // Thông tin về giờ làm việc
  doc.setFontSize(14);
  doc.text('Thông tin giờ làm việc:', 14, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  doc.text(`Giờ làm thường: ${salary.regularHours}h ${salary.regularMinutes}p`, 20, yPos);
  yPos += 7;
  doc.text(`Giờ tăng ca: ${salary.overtimeHours}h ${salary.overtimeMinutes}p`, 20, yPos);
  yPos += 7;
  doc.text(`Giờ làm cuối tuần: ${salary.weekendHours}h ${salary.weekendMinutes}p`, 20, yPos);
  yPos += 7;
  doc.text(`Nghỉ phép có lương: ${salary.paidLeaveHours}h`, 20, yPos);
  yPos += 12;
  
  // Thông tin về mức lương
  doc.setFontSize(14);
  doc.text('Thông tin mức lương:', 14, yPos);
  yPos += 10;
  
  // Thông tin cấu hình lương
  doc.setFontSize(11);
  salaryRateInfo.forEach(info => {
    doc.text(`${info.label}: ${info.value}`, 20, yPos);
    yPos += 7;
  });
  yPos += 5;
  
  // Thông tin chi tiết về lương
  doc.setFontSize(14);
  doc.text('Chi tiết lương:', 14, yPos);
  yPos += 10;
  
  // Bảng chi tiết lương
  const baseAmount = salary.regularAmount + salary.overtimeAmount + salary.weekendAmount + salary.paidLeaveAmount;
  
  const salaryDetails = [
    { category: 'Lương giờ làm thường', amount: formatCurrency(salary.regularAmount) },
    { category: 'Lương tăng ca', amount: formatCurrency(salary.overtimeAmount) },
    { category: 'Lương làm cuối tuần', amount: formatCurrency(salary.weekendAmount) },
    { category: 'Lương nghỉ phép', amount: formatCurrency(salary.paidLeaveAmount) },
    { category: 'Lương cơ bản', amount: formatCurrency(baseAmount) }
  ];
  
  // Thêm thông tin thưởng nếu có
  if (salary.bonusAmount > 0) {
    if (salary.bonusPercentage > 0) {
      salaryDetails.push({ category: `Thưởng (${salary.bonusPercentage}%)`, amount: formatCurrency(salary.bonusAmount) });
    } else {
      salaryDetails.push({ category: 'Thưởng', amount: formatCurrency(salary.bonusAmount) });
    }
  }
  
  // Thêm tổng lương
  salaryDetails.push({ category: 'TỔNG LƯƠNG', amount: formatCurrency(salary.totalAmount) });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Loại', 'Thành tiền']],
    body: salaryDetails.map(detail => [detail.category, detail.amount]),
    theme: 'grid',
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    styles: {
      fontSize: 10,
      cellPadding: 3
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Chữ ký
  doc.setFontSize(11);
  doc.text('Ngày .... tháng .... năm ....', 150, yPos, { align: 'center' });
  yPos += 10;
  
  doc.text('Người nhận lương', 50, yPos, { align: 'center' });
  doc.text('Người phê duyệt', 150, yPos, { align: 'center' });
  
  // Lưu PDF
  doc.save(filename);
}; 