// PDF Generator sử dụng jsPDF
import { jsPDF } from 'jspdf';
// Import jspdf-autotable 
import autoTable from 'jspdf-autotable';

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