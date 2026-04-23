/**
 * SMS sending utility.
 * Uses Twilio when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER
 * env vars are present; otherwise logs to console (dev/test mode).
 */

export interface SmsSendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/**
 * Sends a verification SMS to the given phone number.
 * @param phone - Colombian phone number (e.g. "3001234567" or "+573001234567")
 * @param code  - 6-digit verification code
 */
export async function sendVerificationSms(
  phone: string,
  code: string
): Promise<SmsSendResult> {
  // Normalize to E.164 format
  const normalized = normalizePhone(phone);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromPhone) {
    return sendViaTwilio(normalized, code, accountSid, authToken, fromPhone);
  }

  // Dev/test fallback — log to console
  console.log(
    `[SMS DEV] To: ${normalized} | Code: ${code} | Message: Tu código de verificación para Santa Elena Platform es: ${code}`
  );
  return { success: true };
}

function normalizePhone(phone: string): string {
  // Already E.164
  if (phone.startsWith("+")) return phone;
  // Has country code without +
  if (phone.startsWith("57")) return `+${phone}`;
  // 10-digit Colombian mobile
  return `+57${phone}`;
}

async function sendViaTwilio(
  to: string,
  code: string,
  accountSid: string,
  authToken: string,
  from: string
): Promise<SmsSendResult> {
  try {
    const body = `Tu código de verificación para Santa Elena Platform es: ${code}. Válido por 10 minutos.`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (err as { message?: string }).message ?? `Twilio error ${response.status}`,
      };
    }

    const data = (await response.json()) as { sid: string };
    return { success: true, sid: data.sid };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido al enviar SMS",
    };
  }
}
