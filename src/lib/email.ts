/**
 * Email sending via AWS SES using the AWS SDK v3.
 * Falls back to console log in dev/test when SES is not configured.
 *
 * Required env vars for SES:
 *   AWS_REGION        (already set by ECS task role)
 *   SES_FROM_EMAIL    e.g. "noreply@santaelenacomunidad.online"
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

export async function sendEmail(options: EmailOptions): Promise<EmailSendResult> {
  const fromEmail = process.env.SES_FROM_EMAIL;
  const region    = process.env.AWS_REGION ?? "us-east-1";

  // Dev/test fallback — no SES configured
  if (!fromEmail) {
    console.log(`[EMAIL DEV] To: ${options.to} | Subject: ${options.subject}\n${options.text}`);
    return { success: true };
  }

  try {
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");

    const client = new SESClient({ region });

    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [options.to] },
      Message: {
        Subject: { Data: options.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: options.text, Charset: "UTF-8" },
          ...(options.html
            ? { Html: { Data: options.html, Charset: "UTF-8" } }
            : {}),
        },
      },
    });

    const result = await client.send(command);
    return { success: true, messageId: result.MessageId };
  } catch (err) {
    console.error("[email] SES error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "SES send error",
    };
  }
}

export async function sendAccountLockedEmail(
  email: string,
  lockedUntil: Date
): Promise<EmailSendResult> {
  const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);

  return sendEmail({
    to: email,
    subject: "Tu cuenta ha sido bloqueada temporalmente - Santa Elena Platform",
    text: [
      "Hola,",
      "",
      `Tu cuenta ha sido bloqueada temporalmente por ${minutesLeft} minutos debido a multiples intentos de inicio de sesion fallidos.`,
      "",
      "Si no fuiste tu, te recomendamos cambiar tu contrasena cuando puedas acceder nuevamente.",
      "",
      "-- Equipo Santa Elena Platform",
    ].join("\n"),
    html: `
      <p>Hola,</p>
      <p>Tu cuenta ha sido <strong>bloqueada temporalmente por ${minutesLeft} minutos</strong>
         debido a multiples intentos de inicio de sesion fallidos.</p>
      <p>Si no fuiste tu, te recomendamos cambiar tu contrasena cuando puedas acceder nuevamente.</p>
      <p>-- Equipo Santa Elena Platform</p>
    `,
  });
}
