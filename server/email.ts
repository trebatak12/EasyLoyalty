import nodemailer from 'nodemailer';

// Gmail SMTP configuration
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const FROM_EMAIL = GMAIL_USER || 'noreply@easyloyalty.example';
const FROM_NAME = process.env.FROM_NAME || 'EasyLoyalty';

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: GMAIL_USER && GMAIL_APP_PASSWORD ? {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  } : undefined,
  tls: {
    rejectUnauthorized: false
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const result = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    
    console.log(`Email sent successfully to ${options.to}: ${result.messageId}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
}

export function generatePasswordResetEmailHtml(resetToken: string, userEmail: string): { html: string; text: string } {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset?token=${resetToken}`;
  
  const html = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset hesla - EasyLoyalty</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      margin-top: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content p {
      line-height: 1.6;
      margin: 16px 0;
      color: #555;
    }
    .reset-button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 24px 0;
      text-align: center;
    }
    .reset-button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      border-top: 1px solid #e9ecef;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    .security-notice {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      color: #856404;
    }
    .expiry-notice {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      color: #721c24;
    }
    @media (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .header, .content, .footer {
        padding: 20px;
      }
      .content h2 {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EasyLoyalty</h1>
    </div>
    <div class="content">
      <h2>Reset hesla</h2>
      <p>Dobrý den,</p>
      <p>obdrželi jsme žádost o reset hesla pro Váš účet s e-mailovou adresou <strong>${userEmail}</strong>.</p>
      
      <p>Pro nastavení nového hesla klikněte na tlačítko níže:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="reset-button">Resetovat heslo</a>
      </div>
      
      <div class="expiry-notice">
        <strong>Pozor:</strong> Tento odkaz je platný pouze 30 minut od odeslání tohoto e-mailu.
      </div>
      
      <p>Pokud nefunguje tlačítko výše, zkopírujte a vložte následující odkaz do prohlížeče:</p>
      <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
      
      <div class="security-notice">
        <strong>Bezpečnostní upozornění:</strong><br>
        Pokud jste o reset hesla nežádali, tento e-mail ignorujte. Vaše heslo zůstane beze změny.
      </div>
    </div>
    <div class="footer">
      <p>Tento e-mail byl odeslán automaticky. Neodpovídejte na něj.</p>
      <p>&copy; ${new Date().getFullYear()} EasyLoyalty. Všechna práva vyhrazena.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Reset hesla - EasyLoyalty

Dobrý den,

obdrželi jsme žádost o reset hesla pro Váš účet s e-mailovou adresou ${userEmail}.

Pro nastavení nového hesla použijte následující odkaz:
${resetUrl}

POZOR: Tento odkaz je platný pouze 30 minut od odeslání tohoto e-mailu.

BEZPEČNOSTNÍ UPOZORNĚNÍ:
Pokud jste o reset hesla nežádali, tento e-mail ignorujte. Vaše heslo zůstane beze změny.

Tento e-mail byl odeslán automaticky. Neodpovídejte na něj.

© ${new Date().getFullYear()} EasyLoyalty. Všechna práva vyhrazena.
`;

  return { html, text };
}

export async function sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void> {
  const { html, text } = generatePasswordResetEmailHtml(resetToken, userEmail);
  
  await sendEmail({
    to: userEmail,
    subject: 'Reset hesla – EasyLoyalty',
    html,
    text,
  });
}