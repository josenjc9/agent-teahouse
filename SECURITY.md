# Security Policy

## Reporting a vulnerability

Please report security issues privately through **Security → Report a vulnerability** on this repository. Do not open a public issue. Include the affected skill (`teahouse-office` or `teahouse-dashboard`), the steps to reproduce, and the impact you observed.

## Scope and design

Both skills run entirely on the user's machine. They make no outbound requests, collect no data and need no credentials; the development server binds to `127.0.0.1` only. A per-skill description of what each script reads and writes is in `teahouse-office/SECURITY.md` and `teahouse-dashboard/SECURITY.md`.

## Supply chain

- Front-end dependencies are pinned to exact versions and installed from the official npm registry; lockfiles are committed.
- Dependabot is enabled for both `app/` packages.
- Release checks: `npm audit` (0 known vulnerabilities at release), a pre-publication privacy scan (`scripts/scan_private.py`), and a verification that the built pages make no external requests.
