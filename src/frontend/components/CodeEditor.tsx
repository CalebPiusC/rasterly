import { useMemo, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import type { InputType } from '../types';

interface Props {
  value: string;
  inputType: InputType;
  onChange: (value: string) => void;
  onRender: () => void;
}

function extensionsFor(inputType: InputType) {
  switch (inputType) {
    case 'css':
      return [css()];
    case 'jsx':
      return [javascript({ jsx: true })];
    case 'tsx':
      return [javascript({ jsx: true, typescript: true })];
    case 'html':
    default:
      return [html()];
  }
}

export default function CodeEditor({ value, inputType, onChange, onRender }: Props) {
  const extensions = useMemo(() => extensionsFor(inputType), [inputType]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onRender();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onRender]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={extensions}
      onChange={onChange}
      theme="dark"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
      }}
      aria-label="Code editor"
    />
  );
}