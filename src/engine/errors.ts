export type RenderErrorCode =
  | 'INVALID_INPUT'
  | 'COMPILATION_ERROR'
  | 'NAVIGATION_ERROR'
  | 'RENDER_TIMEOUT'
  | 'BROWSER_ERROR'
  | 'IMAGE_PROCESSING_ERROR'
  | 'SSRF_BLOCKED'
  | 'UNSUPPORTED_OPERATION'
  | 'INTERNAL_ERROR';

export class RenderError extends Error {
  readonly code: RenderErrorCode;
  readonly detail?: string;
  readonly cause?: unknown;

  constructor(code: RenderErrorCode, message: string, detail?: string, cause?: unknown) {
    super(message);
    this.name = 'RenderError';
    this.code = code;
    this.detail = detail;
    this.cause = cause;
    Error.captureStackTrace?.(this, RenderError);
  }

  toJSON() {
    return { code: this.code, message: this.message, detail: this.detail };
  }
}

export function isRenderError(error: unknown): error is RenderError {
  return error instanceof RenderError;
}