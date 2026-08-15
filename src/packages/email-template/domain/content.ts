export type BodyLanguage = 'id' | 'en';

export const BODY_LANGUAGE_LABEL: Record<BodyLanguage, string> = {
  id: 'Body dalam bahasa Indonesia',
  en: 'Body dalam bahasa Inggris -- kirim apa adanya, jangan diterjemahkan',
};

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
}

export interface EmailTemplate {
  id: string;
  institution: string;
  title: string;
  purpose: string;
  to: string;
  subject: string;
  bodyLanguage: BodyLanguage;
  body: string;
  fields: TemplateField[];
  attachments: string[];
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'nusuk-reset-id',
    institution: 'Nusuk Care',
    title: 'Reset ID Nusuk yang dipakai pihak lain',
    purpose:
      'Dipakai ketika ID Nusuk Anda dikuasai pihak lain sehingga tidak bisa lagi dipakai memesan slot Raudhah.',
    to: 'care@haj.gov.sa',
    subject: 'Reset ID NUSUK',
    bodyLanguage: 'en',
    body: `Dear Nusuk Care,

In reference to the attached screenshot, our NUSUK ID has been sabotaged by other parties.

Please kindly help to reset our ID so that we can use our ID to book Rawdah.

Your response would be highly appreciated.

Yours,
{{nama}}`,
    fields: [
      {
        key: 'nama',
        label: 'Nama Lengkap',
        placeholder: 'Nama sesuai paspor',
      },
    ],
    attachments: [
      'Screenshot layar yang menunjukkan ID Nusuk sedang dipakai orang lain',
      'Foto atau scan visa umroh yang masih aktif',
    ],
  },
];
