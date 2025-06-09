import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();
    console.log('Email request received:', { to, subject });

    if (!to || !subject || !html) {
      console.error('Missing required fields for email:', { to, subject, html: !!html });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Lấy thông tin email từ biến môi trường hoặc sử dụng giá trị mặc định
    const emailUser = process.env.EMAIL_USER || 'lengocgiau2k3@gmail.com';
    const emailPassword = process.env.EMAIL_PASSWORD || 'xbue jogg asjd gdjn';

    console.log('Using email configuration:', { 
      emailUser, 
      passwordProvided: !!emailPassword,
      passwordLength: emailPassword ? emailPassword.length : 0
    });

    // Kiểm tra xem có cấu hình email thật hay không
    let testAccount;
    let transporter;

    if (emailUser === 'your-email@gmail.com' || emailPassword === 'your-app-password') {
      console.log('No real email config found, using Ethereal test account');
      
      // Sử dụng Ethereal để test gửi email (không thực sự gửi email thật)
      testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      console.log('Created Ethereal test account:', testAccount.user);
    } else {
      // Thử nhiều cấu hình Gmail khác nhau
      try {
        console.log('Attempting to setup Gmail transport with OAuth2...');
        
        // Cấu hình 1: Sử dụng cấu hình cơ bản
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPassword,
          },
        });
        
        // Kiểm tra kết nối
        await transporter.verify();
        console.log('Gmail transport verified successfully');
      } catch (error) {
        console.error('Gmail transport failed:', error);
        
        console.log('Attempting fallback to direct SMTP...');
        // Cấu hình 2: Thử kết nối trực tiếp với SMTP
        try {
          transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            auth: {
              user: emailUser,
              pass: emailPassword,
            },
          });
          
          // Kiểm tra kết nối
          await transporter.verify();
          console.log('Direct SMTP transport verified successfully');
        } catch (directSmtpError) {
          console.error('Direct SMTP transport also failed:', directSmtpError);
          
          // Nếu cả 2 phương pháp đều thất bại, tạo Ethereal
          console.log('Both Gmail methods failed, falling back to Ethereal test account');
          testAccount = await nodemailer.createTestAccount();
          
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
          
          console.log('Created Ethereal test account as fallback:', testAccount.user);
        }
      }
    }

    // Gửi email
    const info = await transporter.sendMail({
      from: testAccount ? testAccount.user : emailUser,
      to,
      subject,
      html,
    });

    console.log('Email sent successfully:', info.messageId);
    
    // Nếu sử dụng Ethereal, hiển thị URL để xem email gửi
    if (testAccount) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL:', previewUrl);
      
      return NextResponse.json({
        success: true,
        note: 'Using test account, email not actually sent to recipient',
        previewUrl,
        fallbackReason: emailUser !== 'your-email@gmail.com' ? 'Gmail authentication failed' : 'No email config'
      });
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email sending failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Hướng dẫn cụ thể dựa trên loại lỗi
    let troubleshooting = '';
    if (errorMessage.includes('535-5.7.8') || errorMessage.includes('Bad credentials')) {
      troubleshooting = `
        Vấn đề xác thực Gmail:
        1. Hãy đảm bảo bạn đã BẬT xác thực 2 bước cho tài khoản Google
        2. Sử dụng App Password (mật khẩu ứng dụng), KHÔNG PHẢI mật khẩu Google thông thường
        3. Tạo App Password tại: https://myaccount.google.com/apppasswords
      `;
    } else if (errorMessage.includes('ECONNREFUSED')) {
      troubleshooting = 'Không thể kết nối đến máy chủ email. Kiểm tra kết nối mạng và cài đặt firewall.';
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: errorMessage,
        troubleshooting 
      },
      { status: 500 }
    );
  }
} 