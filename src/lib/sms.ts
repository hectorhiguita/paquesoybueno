import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const MESSAGE_BODY = (code: string) =>
  `Tu código de verificación para Santa Elena es: ${code}. Válido por 10 minutos.`;

export async function sendVerificationSms(
  phone: string,
  code: string
): Promise<SmsSendResult> {
  const normalized = normalizePhone(phone);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[SMS DEV] To: ${normalized} | Code: ${code} | Message: ${MESSAGE_BODY(code)}`);
    return { success: true };
  }

  return sendViaSns(normalized, code);
}

function normalizePhone(phone: string): string {
  if (phone.startsWith("+")) return phone;
  if (phone.startsWith("57")) return `+${phone}`;
  return `+57${phone}`;
}

async function sendViaSns(to: string, code: string): Promise<SmsSendResult> {
  const client = new SNSClient({ region: process.env.AWS_REGION ?? "us-east-1" });

  try {
    const result = await client.send(
      new PublishCommand({
        PhoneNumber: to,
        Message: MESSAGE_BODY(code),
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
          "AWS.SNS.SMS.SenderID": {
            DataType: "String",
            StringValue: "SantaElena",
          },
        },
      })
    );

    return { success: true, messageId: result.MessageId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido al enviar SMS",
    };
  }
}
