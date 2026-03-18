# Contributing to Wiki Bite

Thanks for your interest in contributing! Here's how to get started.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
pnpm dev
```

## Development

- Run tests: `pnpm test`
- Type check: `pnpm -r typecheck`
- Build: `pnpm build`

## Pull Request Process

1. Fork the repo and create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass (`pnpm test`)
4. Ensure TypeScript compiles (`pnpm -r typecheck`)
5. Open a PR with a clear description of your changes

## Coding Standards

- TypeScript strict mode — no `any` unless absolutely necessary
- Tests with Vitest + Testing Library
- Follow existing code patterns and conventions
