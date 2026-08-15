import type { EmailTemplate } from './content';

const TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

export const MAILTO_MAX_LENGTH = 1900;

export const templateTokens = (template: EmailTemplate): string[] => {
  return Array.from(template.body.matchAll(TOKEN_PATTERN), (match) => match[1]);
};

export interface MailtoDraft {
  href: string;
  withinLimit: boolean;
}

export const renderBody = (template: EmailTemplate, values: Record<string, string>): string => {
  const fields = new Map(template.fields.map((field) => [field.key, field]));

  return template.body.replace(TOKEN_PATTERN, (token, key: string) => {
    const field = fields.get(key);
    if (!field) return token;

    const value = (values[key] ?? '').trim();
    return value === '' ? `[${field.label}]` : value;
  });
};

export const buildMailtoHref = (
  template: EmailTemplate,
  values: Record<string, string>,
): MailtoDraft => {
  const body = renderBody(template, values).replace(/\r\n|\r|\n/g, '\r\n');

  const query = [
    `subject=${encodeURIComponent(template.subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&');

  const href = `mailto:${template.to}?${query}`;

  return { href, withinLimit: href.length <= MAILTO_MAX_LENGTH };
};
