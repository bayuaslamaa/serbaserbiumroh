export type CommunityJoinStatus = 'NEW' | 'MATCHED' | 'REJECTED';

export type CommunityJoinInput = {
  fullName?: unknown;
  phone?: unknown;
  socialUsername?: unknown;
  intent?: unknown;
};

export type ParsedCommunityJoinRequest = {
  fullName: string;
  phone: string;
  normalizedPhone: string;
  socialUsername: string | null;
  normalizedSocialUsername: string | null;
  intent: string | null;
};

export type CommunityJoinValidationResult =
  { success: true; data: ParsedCommunityJoinRequest } | { success: false; error: string };

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 32;
const MAX_SOCIAL_LENGTH = 120;
const MAX_INTENT_LENGTH = 500;

const readOptionalString = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

export const normalizeSocialUsername = (username: string) => {
  const trimmed = username.trim().toLowerCase();
  const withoutQuery = trimmed.split(/[?#]/)[0];
  const segments = withoutQuery.split('/').filter(Boolean);
  const candidate = segments.length > 0 ? segments[segments.length - 1] : withoutQuery;
  return candidate.replace(/^@+/, '').replace(/\s+/g, '');
};

export const parseCommunityJoinInput = (
  input: CommunityJoinInput,
): CommunityJoinValidationResult => {
  const fullName = readOptionalString(input.fullName);
  const phone = readOptionalString(input.phone);
  const socialUsername = readOptionalString(input.socialUsername);
  const intent = readOptionalString(input.intent);

  if (!fullName) return { success: false, error: 'Nama lengkap wajib diisi' };
  if (fullName.length > MAX_NAME_LENGTH) {
    return { success: false, error: `Nama lengkap maksimal ${MAX_NAME_LENGTH} karakter` };
  }

  if (!phone) return { success: false, error: 'Nomor HP wajib diisi' };
  if (phone.length > MAX_PHONE_LENGTH) {
    return { success: false, error: `Nomor HP maksimal ${MAX_PHONE_LENGTH} karakter` };
  }

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 8) {
    return { success: false, error: 'Nomor HP belum valid' };
  }

  if (socialUsername.length > MAX_SOCIAL_LENGTH) {
    return {
      success: false,
      error: `Username sosial media maksimal ${MAX_SOCIAL_LENGTH} karakter`,
    };
  }

  if (intent.length > MAX_INTENT_LENGTH) {
    return { success: false, error: `Alasan bergabung maksimal ${MAX_INTENT_LENGTH} karakter` };
  }

  const normalizedSocialUsername = socialUsername ? normalizeSocialUsername(socialUsername) : null;

  return {
    success: true,
    data: {
      fullName,
      phone,
      normalizedPhone,
      socialUsername: socialUsername || null,
      normalizedSocialUsername: normalizedSocialUsername || null,
      intent: intent || null,
    },
  };
};
