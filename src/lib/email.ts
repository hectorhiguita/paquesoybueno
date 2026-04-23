/**
 * Email sending utility.
 * Uses SMTP via nodemailer when SMTP_HOST, SMTP_USER, SMTP_PASS env vars are
 * present; otherwise logs to console (dev/test mode).
 *
 * Nodemailer is an optional peer dependency — install it with:
 *   npm install nodemailer
 *   npm install -D @types/nodemailer
 */

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailSendResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "Santa Elena Platform <noreply@santaelena.local>";

  if (host && user && pass) {
    return sendViaSmtp({ ...options, from }, host, user, pass);
  }

  // Dev/test fallback — log to console
  console.log(
    `[EMAIL DEV] To: ${options.to} | Subject: ${options.subject}\n${options.text}`
  );
  return { success: true };
}

/**
 * Sends an account-locked notification email.
 */
export async function sendAccountLockedEmail(
  email: string,
  lockedUntil: Date
): Promise<EmailSendResult> {
  const minutesLeft = Math.ceil(
    (lockedUntil.getTime() - Date.now()) / 60_000
  );

  return sendEmail({
    to: email,
    subject: "Tu cuenta ha sido bloqueada temporalmente — Santa Elena Platform",
    text: [
      "Hola,",
      "",
      `Tu cuenta ha sido bloqueada temporalmente por ${minutesLeft} minutos debido a múltiples intentos de inicio de sesión fallidos.`,
      "",
      "Si no fuiste tú, te recomendamos cambiar tu contraseña cuando puedas acceder nuevamente.",
      "",
      "— Equipo Santa Elena Platform",
    ].join("\n"),
    html: `
      <p>Hola,</p>
      <p>Tu cuenta ha sido <strong>bloqueada temporalmente por ${minutesLeft} minutos</strong> debido a múltiples intentos de inicio de sesión fallidos.</p>
      <p>Si no fuiste tú, te recomendamos cambiar tu contraseña cuando puedas acceder nuevamente.</p>
      <p>— Equipo Santa Elena Platform</p>
    `,
  });
}

// ---------------------------------------------------------------------------
// SMTP transport (nodemailer)
// ---------------------------------------------------------------------------

async function sendViaSmtp(
  options: EmailOptions & { from: string },
  host: string,
  user: string,
  pass: string
): Promise<EmailSendResult> {
  try {
    // Dynamic import so nodemailer is optional
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      console.warn("[email] nodemailer not installed; falling back to console log");
      console.log(`[EMAIL FALLBACK] To: ${options.to} | Subject: ${options.subject}`);
      return { success: true };
    }

    const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido al enviar email",
    };
  }
}
