import type { InputType } from '../types';

export const STARTER_EXAMPLES: Record<InputType, string> = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body {
      margin: 0;
      font-family: 'Inter', system-ui, sans-serif;
      background: #0f0f12;
      color: #ececf1;
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
    .card {
      padding: 48px 56px;
      border-radius: 20px;
      background: linear-gradient(160deg, #1c1c21, #111113);
      border: 1px solid #27272e;
      box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.7);
      text-align: center;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5b8cff;
      margin-bottom: 16px;
    }
    h1 { margin: 0 0 8px; font-size: 40px; letter-spacing: -0.02em; }
    p { margin: 0; color: #8a8a99; font-size: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Hello Rasterly</span>
    <h1>Code → Image</h1>
    <p>Rendered in a real browser.</p>
  </div>
</body>
</html>`,
  css: `/* Your stylesheet is applied to a sample document. */
.rasterly-showcase {
  font-family: 'Inter', system-ui, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  padding: 64px 32px;
  color: #ececf1;
}
.rasterly-showcase h1 {
  font-size: 44px;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
}
.rasterly-showcase p {
  color: #8a8a99;
  line-height: 1.6;
}
.rasterly-showcase button {
  background: #5b8cff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  cursor: pointer;
  margin: 8px 6px 0 0;
}
.rasterly-showcase a { color: #5b8cff; }
.rasterly-showcase blockquote {
  border-left: 3px solid #5b8cff;
  margin: 16px 0;
  padding: 4px 16px;
  color: #b8b8c4;
}`,
  jsx: `function Card() {
  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: 48,
      borderRadius: 20,
      background: 'linear-gradient(160deg,#1c1c21,#111113)',
      border: '1px solid #27272e',
      color: '#ececf1',
      textAlign: 'center',
      width: 520
    }}>
      <span style={{ color: '#5b8cff', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        React Component
      </span>
      <h1 style={{ margin: '12px 0 8px', fontSize: 40, letterSpacing: '-0.02em' }}>
        JSX → Image
      </h1>
      <p style={{ margin: 0, color: '#8a8a99', fontSize: 16 }}>
        Compiled with esbuild, rendered with Chromium.
      </p>
    </div>
  );
}`,
  tsx: `type Props = { name: string; accent: string };

const Badge = ({ name, accent }: Props) => (
  <span style={{
    color: accent,
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  }}>
    {name}
  </span>
);

function Profile() {
  const user = { name: 'TypeScript', accent: '#5b8cff' };
  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: 48,
      borderRadius: 20,
      background: 'linear-gradient(160deg,#1c1c21,#111113)',
      border: '1px solid #27272e',
      color: '#ececf1',
      width: 520,
    }}>
      <Badge {...user} />
      <h1 style={{ margin: '12px 0 8px', fontSize: 40 }}>TSX → Image</h1>
      <p style={{ margin: 0, color: '#8a8a99' }}>Typed components, rendered cleanly.</p>
    </div>
  );
}`,
  url: 'https://example.com',
};