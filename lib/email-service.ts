/**
 * Dịch vụ gửi email
 */
export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{success: boolean; previewUrl?: string; error?: string}> => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    const data = await response.json();
    return {
      success: data.success,
      previewUrl: data.previewUrl,
      error: data.error
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Tạo template email cho người dùng đăng ký
 */
export const createRegistrationEmailTemplate = ({
  name,
  employeeId,
  qrCodeDataUrl,
  uniqueCode,
  department,
  position,
}: {
  name: string;
  employeeId: string;
  qrCodeDataUrl: string;
  uniqueCode: string;
  department: string;
  position: string;
}): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            background-color: #4f46e5;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
          }
          .qr-code {
            text-align: center;
            margin: 20px 0;
          }
          .qr-code img {
            max-width: 200px;
          }
          .info-box {
            background-color: #f3f4f6;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .code-box {
            font-family: monospace;
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            font-size: 18px;
            text-align: center;
            letter-spacing: 2px;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Đăng Ký Chấm Công Thành Công</h1>
        </div>
        <div class="content">
          <p>Xin chào <strong>${name}</strong>,</p>
          
          <p>Cảm ơn bạn đã đăng ký tài khoản chấm công. Dưới đây là thông tin tài khoản của bạn:</p>
          
          <div class="info-box">
            <p><strong>Mã nhân viên:</strong> ${employeeId}</p>
            <p><strong>Phòng ban:</strong> ${department}</p>
            <p><strong>Vị trí:</strong> ${position}</p>
          </div>
          
          <p>Bạn có thể sử dụng mã QR dưới đây để chấm công:</p>
          
          <div class="qr-code">
            <img src="${qrCodeDataUrl}" alt="Mã QR chấm công" />
          </div>
          
          <p>Hoặc sử dụng mã dưới vạch để nhập thủ công:</p>
          
          <div class="code-box">
            ${uniqueCode}
          </div>
          
          <p>Lưu ý:</p>
          <ul>
            <li>Tài khoản của bạn đang ở trạng thái chờ duyệt</li>
            <li>Sau khi được admin duyệt, bạn có thể sử dụng mã QR để chấm công</li>
            <li>Vui lòng lưu giữ email này để sử dụng sau này</li>
          </ul>
        </div>
        <div class="footer">
          <p>Đây là email tự động, vui lòng không trả lời email này.</p>
          <p>&copy; ${new Date().getFullYear()} Hệ thống chấm công</p>
        </div>
      </body>
    </html>
  `;
}; 