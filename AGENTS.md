# AGENTS.md

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/` (one directory per feature; the spec is `spec.md`, tickets under `issues/`). See `docs/agents/issue-tracker.md`.

### Triage labels

Issues carry a `Status:` line using the label vocabulary in `docs/agents/triage-labels.md` (e.g. `ready-for-agent`, `needs-triage`).

### Domain docs

Single-context. Read `CONTEXT.md` (when present) and ADRs in `docs/adr/` that touch the area you're working in. See `docs/agents/domain.md`.

### Business features

New business features are built as full vertical slices per the `business-feature` skill (`.agents/skills/business-feature/`): pure logic at a seam, data seam, ACL-guarded API, page, i18n, tests. Run `/implement` as the outer process.

## Git

The host `git` is a Rust wrapper that routes pushes through a Unix socket and hangs or fails. Push with a real git inside Docker instead:

```bash
docker run --rm --entrypoint sh -v "$(pwd):/repo" alpine/git:latest -c "cd /repo && git push origin main"
```

See `.agents/skills/git-push-via-docker/SKILL.md`.
