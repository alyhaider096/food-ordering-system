const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const orderReferencePattern = /^FH-\d{6}-\d{4}$/;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function isOrderReference(value: string): boolean {
  return orderReferencePattern.test(value);
}
