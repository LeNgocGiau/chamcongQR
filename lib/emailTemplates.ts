export interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: "absent",
    name: "Thông báo chưa chấm công",
    subject: "Thông báo: Bạn chưa chấm công ngày hôm nay",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #d32f2f; text-align: center;">Thông báo: Chưa chấm công</h2>
        <p>Kính gửi <strong>{employeeName}</strong>,</p>
        <p>Hệ thống ghi nhận bạn chưa thực hiện chấm công hôm nay ({currentDate}). Vui lòng thực hiện chấm công ngay khi nhận được thông báo này.</p>
        <p>Nếu bạn đã chấm công nhưng vẫn nhận được thông báo này, vui lòng liên hệ với phòng nhân sự để được hỗ trợ.</p>
        <p style="margin-top: 20px;">Trân trọng,</p>
        <p><strong>Phòng nhân sự</strong></p>
      </div>`
  },
  {
    id: "holiday",
    name: "Thông báo nghỉ lễ",
    subject: "Thông báo: Lịch nghỉ lễ sắp tới",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #1976d2; text-align: center;">Thông báo nghỉ lễ</h2>
        <p>Kính gửi <strong>{employeeName}</strong>,</p>
        <p>Công ty trân trọng thông báo lịch nghỉ lễ sắp tới như sau:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Thời gian nghỉ:</strong> {holidayDates}</p>
          <p><strong>Lý do:</strong> {holidayReason}</p>
          <p><strong>Lưu ý:</strong> {holidayNotes}</p>
        </div>
        <p>Mọi thắc mắc vui lòng liên hệ với phòng nhân sự để được giải đáp.</p>
        <p style="margin-top: 20px;">Trân trọng,</p>
        <p><strong>Ban Giám đốc</strong></p>
      </div>`
  },
  {
    id: "emergency",
    name: "Thông báo nghỉ khẩn cấp",
    subject: "KHẨN: Thông báo nghỉ khẩn cấp",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #d32f2f; text-align: center;">THÔNG BÁO KHẨN</h2>
        <p>Kính gửi <strong>{employeeName}</strong>,</p>
        <p>Do tình hình khẩn cấp, công ty quyết định cho nhân viên nghỉ làm vào ngày <strong>{emergencyDate}</strong>.</p>
        <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Lý do:</strong> {emergencyReason}</p>
          <p><strong>Thời gian áp dụng:</strong> {emergencyTime}</p>
          <p><strong>Hướng dẫn:</strong> {emergencyInstructions}</p>
        </div>
        <p>Vui lòng theo dõi email và điện thoại để cập nhật thông tin mới nhất.</p>
        <p style="margin-top: 20px;">Trân trọng,</p>
        <p><strong>Ban Giám đốc</strong></p>
      </div>`
  },
  {
    id: "termination",
    name: "Thông báo chấm dứt hợp đồng",
    subject: "Thông báo: Chấm dứt hợp đồng lao động",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #424242; text-align: center;">Thông báo chấm dứt hợp đồng lao động</h2>
        <p>Kính gửi <strong>{employeeName}</strong>,</p>
        <p>Theo quyết định của Ban Giám đốc, công ty xin thông báo về việc chấm dứt hợp đồng lao động với bạn:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Ngày hiệu lực:</strong> {terminationDate}</p>
          <p><strong>Lý do:</strong> {terminationReason}</p>
          <p><strong>Các thủ tục cần hoàn tất:</strong> {terminationProcedures}</p>
        </div>
        <p>Mọi thắc mắc vui lòng liên hệ với phòng nhân sự để được giải đáp.</p>
        <p style="margin-top: 20px;">Trân trọng,</p>
        <p><strong>Phòng nhân sự</strong></p>
      </div>`
  },
  {
    id: "suspension",
    name: "Thông báo đình chỉ tài khoản",
    subject: "Thông báo: Tài khoản của bạn đã bị đình chỉ",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #d32f2f; text-align: center;">Thông báo đình chỉ tài khoản</h2>
        <p>Kính gửi <strong>{employeeName}</strong>,</p>
        <p>Chúng tôi rất tiếc phải thông báo rằng tài khoản chấm công của bạn đã bị đình chỉ.</p>
        <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Lý do:</strong> {suspensionReason}</p>
          <p><strong>Thời gian đình chỉ:</strong> Từ {suspensionStart} đến {suspensionEnd}</p>
        </div>
        <p>Trong thời gian này, bạn sẽ không thể sử dụng mã QR để chấm công. Vui lòng liên hệ với phòng nhân sự để biết thêm chi tiết.</p>
        <p style="margin-top: 20px;">Trân trọng,</p>
        <p><strong>Phòng nhân sự</strong></p>
      </div>`
  },
  {
    id: "restoration",
    name: "Thông báo khôi phục tài khoản",
    subject: "Thông báo: Tài khoản của bạn đã được khôi phục",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2e7d32; text-align: center;">Thông báo khôi phục tài khoản</h2>
        <p>Kính gửi <strong>{employeeName}</strong>,</p>
        <p>Chúng tôi vui mừng thông báo rằng tài khoản chấm công của bạn đã được khôi phục và hoạt động bình thường trở lại.</p>
        <p>Bạn có thể tiếp tục sử dụng mã QR của mình để chấm công ngay từ bây giờ.</p>
        <p>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với phòng nhân sự.</p>
        <p style="margin-top: 20px;">Trân trọng,</p>
        <p><strong>Phòng nhân sự</strong></p>
      </div>`
  }
] 