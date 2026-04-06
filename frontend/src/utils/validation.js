const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10,15}$/;
const SCHOOL_CODE_REGEX = /^[A-Z0-9-]{2,20}$/;
const SECTION_REGEX = /^[A-Z0-9]{1,10}$/;
const ROLL_NUMBER_REGEX = /^\d{1,6}$/;

export const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ");

export const normalizeEmail = (value) => normalizeText(value).toLowerCase();

export const normalizeSchoolCode = (value) => normalizeText(value).toUpperCase();

export const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

export const isValidEmail = (value) => EMAIL_REGEX.test(normalizeEmail(value));

export const isValidPhone = (value) => PHONE_REGEX.test(normalizePhone(value));

export const isValidSchoolCode = (value) => SCHOOL_CODE_REGEX.test(normalizeSchoolCode(value));

export const isValidSection = (value) => SECTION_REGEX.test(normalizeText(value).toUpperCase());

export const isValidRollNumber = (value) => ROLL_NUMBER_REGEX.test(normalizeText(value));

export const isNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

export const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const isValidMarks = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;

export const isValidYear = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 2000 && Number(value) <= 2100;

export const hasLengthBetween = (value, min, max) => {
  const normalized = normalizeText(value);
  return normalized.length >= min && normalized.length <= max;
};

export const isValidDateInput = (value) => {
  const normalized = normalizeText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return false;
  }

  const parsedDate = new Date(`${normalized}T00:00:00Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === normalized;
};
