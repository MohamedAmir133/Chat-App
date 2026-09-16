import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}
  async sendResetPasswordEmail(to: string, otp: number | string, resetUrl?: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested to reset your password. Use the following 6-digit OTP code to complete the process:</p>
        <div style="background-color: #FFF0EB; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #FF5A36;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This OTP code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        ${
          resetUrl
            ? `<p style="margin-top: 20px; text-align: center;"><a href="${resetUrl}" style="background-color: #FF5A36; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Password Directly</a></p>`
            : ''
        }
      </div>
    `;

    try {
      await this.mailerService.sendMail({
        to,
        subject: `Your Password Reset OTP: ${otp} - Chat App`,
        html: htmlContent,
      });
      this.logger.log(`Password reset email sent successfully to ${to} (OTP: ${otp})`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${to}`, error);
      throw error;
    }
  }
}
