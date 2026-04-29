export interface ToolMeta {
  condition: string | null;
  pricePerHourCop: number | null;
  pricePerDayCop: number | null;
}

export function parseToolMeta(raw: string | null | undefined): ToolMeta {
  if (!raw) {
    return {
      condition: null,
      pricePerHourCop: null,
      pricePerDayCop: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ToolMeta>;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      ("condition" in parsed || "pricePerHourCop" in parsed || "pricePerDayCop" in parsed)
    ) {
      return {
        condition: typeof parsed.condition === "string" ? parsed.condition : null,
        pricePerHourCop:
          typeof parsed.pricePerHourCop === "number" ? parsed.pricePerHourCop : null,
        pricePerDayCop:
          typeof parsed.pricePerDayCop === "number" ? parsed.pricePerDayCop : null,
      };
    }
  } catch {
    // Backward compatibility: older tool listings stored only the condition.
  }

  return {
    condition: raw,
    pricePerHourCop: null,
    pricePerDayCop: null,
  };
}

export function serializeToolMeta(meta: ToolMeta): string {
  return JSON.stringify({
    condition: meta.condition,
    pricePerHourCop: meta.pricePerHourCop,
    pricePerDayCop: meta.pricePerDayCop,
  });
}
