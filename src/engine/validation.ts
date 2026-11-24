import { z } from 'zod';

const inputTypeSchema = z.enum(['html', 'css', 'jsx', 'tsx', 'next', 'url']);
const formatSchema = z.enum(['png', 'jpeg', 'webp']);
const scaleSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Must be a hex color');

export const renderConfigSchema = z.object({
  code: z.string().min(1, 'Code must not be empty').max(2_000_000, 'Code exceeds 2MB limit'),
  inputType: inputTypeSchema.default('html'),
  format: formatSchema.default('png'),
  width: z.number().int().min(16).max(8192).default(1200),
  height: z.number().int().min(16).max(8192).default(800),
  scale: scaleSchema.default(1),
  fullPage: z.boolean().default(false),
  transparent: z.boolean().default(false),
  backgroundColor: hexColor.default('#ffffff'),
  quality: z.number().int().min(1).max(100).default(90),
  timeoutMs: z.number().int().min(1000).max(120_000).optional(),
});

export type RenderConfigInput = z.infer<typeof renderConfigSchema>;

export function parseRenderConfig(input: unknown) {
  const result = renderConfigSchema.safeParse(input);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }
  return { success: true as const, data: result.data };
}