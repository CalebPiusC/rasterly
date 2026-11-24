export type InputType = 'html' | 'css' | 'jsx' | 'tsx' | 'url';
export type OutputFormat = 'png' | 'jpeg' | 'webp';

export interface RenderSettings {
  inputType: InputType;
  format: OutputFormat;
  width: number;
  height: number;
  scale: 1 | 2 | 3;
  fullPage: boolean;
  transparent: boolean;
  backgroundColor: string;
  quality: number;
}

export interface RenderMetadata {
  width: number;
  height: number;
  format: OutputFormat;
  scale: number;
  bytes: number;
  durationMs: number;
  fullPage: boolean;
  transparent: boolean;
}

export interface RenderResponse {
  blob: Blob;
  metadata: RenderMetadata;
}