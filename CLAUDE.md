# CLAUDE.md — Instructions for Claude Code

This file contains project-specific rules for Claude Code when working in the DailyDay repository.

---

## Branch Workflow

This project is treated as a real company project. Follow these rules strictly.

**Never commit directly to `dev` or `main`.**

Before starting any task, feature, or fix:

```bash
git checkout dev
git pull
git checkout -b feature/<short-name>
```

Then open a PR targeting `dev`.

### Rules

- One focused PR per feature or fix
- Branch naming prefixes: `feature/`, `fix/`, `chore/`
- Wait for all CI checks to pass: Lint, Type Check, Tests, Build
- Wait for CodeRabbit review before merging
- Merge only when all checks are green

### Why

Direct commits to `dev` skip the PR review process (CI + CodeRabbit). The user wants every change reviewed before it lands on `dev`.
