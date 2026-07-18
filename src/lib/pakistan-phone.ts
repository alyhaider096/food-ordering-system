export const PAKISTAN_MOBILE_ERROR =
  "Please enter a valid Pakistan mobile number, like 0300-1234567 or +92 300 1234567.";

const pakistanMobilePattern = /^923\d{9}$/;

export type PakistanMobileNumber = {
  e164: string;
  local: string;
  display: string;
  whatsapp: string;
};

export function normalizePakistanMobileNumber(input: string): PakistanMobileNumber | null {
  let digits = input.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  const whatsapp = digits.startsWith("92")
    ? digits
    : digits.startsWith("0")
      ? `92${digits.slice(1)}`
      : digits.startsWith("3")
        ? `92${digits}`
        : digits;

  if (!pakistanMobilePattern.test(whatsapp)) {
    return null;
  }

  const local = `0${whatsapp.slice(2)}`;

  return {
    display: `${local.slice(0, 4)}-${local.slice(4)}`,
    e164: `+${whatsapp}`,
    local,
    whatsapp,
  };
}

export function toWhatsAppPhoneNumber(input: string) {
  return normalizePakistanMobileNumber(input)?.whatsapp ?? null;
}

export function isPakistanMobileNumber(input: string) {
  return Boolean(normalizePakistanMobileNumber(input));
}
