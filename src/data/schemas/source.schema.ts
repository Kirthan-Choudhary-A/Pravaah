import { z } from 'zod';

const ALLOWED_DOMAINS = [
  'indiacode.nic.in',
  'egazette.gov.in',
  'morth.nic.in',
  'parivahan.gov.in',
  'sarathi.parivahan.gov.in',
  'vahan.parivahan.gov.in',
  'transport.telangana.gov.in',
  'transport.karnataka.gov.in',
  'transport.maharashtra.gov.in',
  'tnsta.gov.in',
  'transport.delhi.gov.in',
] as const;

export function isValidSourceUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return ALLOWED_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export const sourceEntrySchema = z.object({
  id: z.string().min(1, 'Source ID is required'),
  title: z.string().min(1, 'Source title is required'),
  url: z
    .string()
    .url('Must be a valid URL')
    .refine(isValidSourceUrl, (val) => ({
      message: `URL domain not in allowed official registry list: ${val}`,
    })),
  publisher: z.string().min(1, 'Publisher is required'),
  kind: z.enum(['statute', 'notification', 'state-portal', 'official-portal']),
  lastChecked: z.string().min(1, 'lastChecked is required'),
  verified: z.literal(false, {
    errorMap: () => ({ message: 'All source items must remain verified: false until confirmed' }),
  }),
  note: z.string(),
});

export const sourcesFileSchema = z.array(sourceEntrySchema);

export type SourceEntrySchemaType = z.infer<typeof sourceEntrySchema>;
