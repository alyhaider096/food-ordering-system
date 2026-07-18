import re


PAKISTAN_MOBILE_ERROR = "Please enter a valid Pakistani mobile number, for example 0300-1234567."


def normalize_pakistan_mobile_number(value: str) -> str | None:
    digits = re.sub(r"\D", "", value or "")

    if digits.startswith("0092"):
        digits = digits[4:]
    elif digits.startswith("92"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits[1:]

    if not re.fullmatch(r"3\d{9}", digits):
        return None

    return f"+92{digits}"


def normalize_required_mobile_number(value: str) -> str:
    normalized = normalize_pakistan_mobile_number(value)
    if not normalized:
        raise ValueError(PAKISTAN_MOBILE_ERROR)
    return normalized


def to_whatsapp_number(value: str) -> str | None:
    normalized = normalize_pakistan_mobile_number(value)
    return normalized.replace("+", "") if normalized else None
