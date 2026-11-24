const REPO_URL = 'https://github.com/rasterly/rasterly';

export default function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-900/60 px-4 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-accent/15 ring-1 ring-accent/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 5h16v14H4z"
              stroke="#5b8cff"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M4 9h16M9 9v10" stroke="#5b8cff" strokeWidth="1.8" />
          </svg>
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Rasterly</span>
        <span className="hidden rounded border border-ink-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-400 sm:inline">
          Code → Image
        </span>
      </div>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="btn-ghost h-8 text-[13px]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 .5C5.7.5.5 5.7.5 12a11.5 11.5 0 0 0 7.9 10.9c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.6-1.3-1.6-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5Z" />
        </svg>
        GitHub
      </a>
    </header>
  );
}