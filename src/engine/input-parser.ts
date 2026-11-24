import type { InputType } from './types.js';

export interface ParsedInput {
  inputType: InputType;
  isFullDocument: boolean;
  usesReact: boolean;
  hasDefaultExport: boolean;
}

const HTML_DOC_RE = /<!doctype\s+html|<html[\s>]/i;
const JSX_HINT_RE = /<[A-Za-z][\w.]*[\s/>]|<\/[A-Za-z]/;
const TS_RE = /:\s*[A-Za-z_$][\w$<>|&\s[\]]*[=;,)]/;
const INTERFACE_RE = /\b(interface|type)\s+[A-Z]/;
const EXPORT_RE = /export\s+default/;

/**
 * Best-effort detection of the input type when the caller does not specify one.
 */
export function detectInputType(code: string, hint?: InputType): InputType {
  if (hint) return hint;
  const trimmed = code.trim();

  if (HTML_DOC_RE.test(trimmed)) return 'html';
  if (EXPORT_RE.test(trimmed) || INTERFACE_RE.test(trimmed)) {
    return /<[A-Za-z]/.test(trimmed) && TS_RE.test(trimmed) ? 'tsx' : 'jsx';
  }
  if (JSX_HINT_RE.test(trimmed) && !/^[\w\s]*\{[\s\S]*\}$/.test(trimmed)) {
    if (INTERFACE_RE.test(trimmed) || TS_RE.test(trimmed)) return 'tsx';
    return 'jsx';
  }
  if (/[.#]?[\w-]+\s*\{[^}]*:[^}]*;|@media|@import/.test(trimmed)) return 'css';
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return 'html';
  return 'html';
}

export function isFullHtmlDocument(code: string): boolean {
  return HTML_DOC_RE.test(code);
}

export function analyzeSource(code: string, inputType: InputType): ParsedInput {
  return {
    inputType,
    isFullDocument: inputType === 'html' ? isFullHtmlDocument(code) : false,
    usesReact: /\bReact\b|useState|useEffect|useRef|useMemo|useCallback|jsx/.test(code),
    hasDefaultExport: EXPORT_RE.test(code),
  };
}