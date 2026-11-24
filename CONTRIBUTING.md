# Contributing to Rasterly

Thanks for your interest in improving Rasterly. This project aims to be a polished, reliable developer tool, so we value correctness, security and attention to detail.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev        # server + web at http://localhost:5173
npm test           # unit + integration
npm run typecheck
npm run lint
```

## Principles

- **The engine stays independent of the frontend.** `src/engine` must not import from `src/frontend` or `src/server`. The public API is `renderToImage`.
- **No fake previews or placeholders.** Every feature must actually work end to end.
- **Security is a feature.** Any change touching untrusted input (code, URLs, network) needs validation, isolation and tests.
- **Prefer correctness over cleverness.** Avoid arbitrary fixed delays in rendering; wait on real signals.

## Making changes

1. Fork and create a branch.
2. Add or update tests for your change.
3. Ensure `npm run typecheck`, `npm test` and `npm run lint` pass.
4. Use clear, conventional commit messages (e.g. `feat(engine): ...`, `fix(server): ...`).
5. Open a pull request describing what changed and how you tested it.

## Adding a new input type or format

- Input types: extend `InputType`, detection in `input-parser.ts`, document construction in `document-builder.ts`, and validation in `validation.ts`.
- Output formats: extend `OutputFormat`, the MIME/extension maps in `types.ts`, and encoding in `image-processor.ts`.

## Reporting bugs

Please include the input, the configuration, the expected vs actual result, and the Rasterly version. For rendering issues, the `X-Rasterly-Metadata` header and any server error `code` are very helpful.

## Security issues

Do **not** open a public issue for security vulnerabilities. Report them privately to the maintainers.