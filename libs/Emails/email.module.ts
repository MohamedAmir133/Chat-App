import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

dotenv.config();

const smtpUser = process.env.SMTP_USER || '';
const configuredFrom = process.env.EMAIL_FROM || '';
const emailFrom = configuredFrom.includes('@') ? configuredFrom : smtpUser;

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 465,
          secure: process.env.SMTP_SECURE === 'true', // true for port 465 (SSL), false for 587 (TLS)
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 15000,
          family: 4,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
        defaults: {
          from: emailFrom || '"Chat App" <noreply@chatapp.com>',
        },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [MailerModule, EmailService],
})
export class EmailModule {}
