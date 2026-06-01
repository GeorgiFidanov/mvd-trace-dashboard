const SECRET_KEYS = ["authorization", "x-api-key", "api-key", "apikey", "token", "secret", "password", "access_token"];

export function redactHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, isSecretKey(key) ? redactValue(value) : value]),
  );
}

export function redactJson<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactJson(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, isSecretKey(key) ? redactValue(String(item)) : redactJson(item)]),
    ) as T;
  }

  return value;
}

export function redactValue(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isSecretKey(key: string) {
  const normalized = key.toLowerCase();
  return SECRET_KEYS.some((secret) => normalized.includes(secret));
}
