export type InputType = 'html' | 'css' | 'jsx' | 'tsx' | 'next' | 'url';

export type OutputFormat = 'png' | 'jpeg' | 'webp';

export type ScaleFactor = 1 | 2 | 3;

export interface RenderConfig {
  code: string;
  inputType: InputType;
  format: OutputFormat;
  width: number;
  height: number;
  scale: ScaleFactor;
  fullPage: boolean;
  transparent: boolean;
  backgroundColor: string;
  quality: number;
  timeoutMs?: number;
}

export interface RenderMetadata {
  width: number;
  height: number;
  format: OutputFormat;
  scale: ScaleFactor;
  bytes: number;
  durationMs: number;
  fullPage: boolean;
  transparent: boolean;
}

export interface RenderResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  metadata: RenderMetadata;
}

export interface NormalizedRenderConfig extends Omit<RenderConfig, 'timeoutMs'> {
  timeoutMs: number;
}

export const MIME_TYPES: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export const EXTENSIONS: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};