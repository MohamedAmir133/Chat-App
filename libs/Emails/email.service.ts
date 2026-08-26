import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}
  async sendResetPasswordEmail(to: string, resetUrl?: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested to reset your password. Use the following Url to complete the process:</p>
        <div style="background-color: #f4f6f8; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1976d2;">${resetUrl}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
        ${
          resetUrl
            ? `<p style="margin-top: 20px;"><a href="${resetUrl}" style="background-color: #1976d2; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>`
            : ''
        }
      </div>
    `;

    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Your Password Reset OTP - Chat App',
        html: htmlContent,
      });
      this.logger.log(`Password reset email sent to ${to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }
}
