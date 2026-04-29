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
  const fromEmail = process.env.SES_FROM_EMAIL || "noreply@santaelenacomunidad.online";
  const region    = process.env.AWS_REGION ?? "us-east-1";

  // Dev/test fallback explícito
  if (!process.env.SES_FROM_EMAIL && process.env.NODE_ENV !== "production") {
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
    console.error("[email] SES error:", {
      region,
      fromEmail,
      to: options.to,
      error: err,
    });
    return {
      success: false,
      error: err instanceof Error ? err.message : "SES send error",
    };
  }
}

export async function sendActivationEmail(
  email: string,
  name: string,
  activationUrl: string
): Promise<EmailSendResult> {
  return sendEmail({
    to: email,
    subject: "Activa tu cuenta en Santa Elena Platform",
    text: [
      `Hola ${name},`,
      "",
      "Gracias por registrarte en Santa Elena Platform.",
      "",
      "Para activar tu cuenta y crear tu contraseña, haz clic en el siguiente enlace:",
      "",
      activationUrl,
      "",
      "Este enlace es de uso unico y expira en 24 horas.",
      "",
      "Si no creaste esta cuenta, ignora este mensaje.",
      "",
      "-- Equipo Santa Elena Platform",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#15803d">Bienvenido a Santa Elena Platform</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Gracias por registrarte. Para activar tu cuenta y crear tu contrasena, haz clic en el boton:</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${activationUrl}"
             style="background:#15803d;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Activar mi cuenta
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">
          Este enlace es de uso unico y expira en 24 horas.<br>
          Si no creaste esta cuenta, ignora este mensaje.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px">Santa Elena Platform &mdash; Comunidad rural de Santa Elena, Medellin</p>
      </div>
    `,
  });
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
