---
name: git-push-via-docker
description: Push git changes when the host's git binary is a Rust wrapper that routes through a local Unix socket and cannot push. Use when git push hangs, strace shows connect to /var/run/git/git.sock, or git panics with "Git remote helper server unix socket not found!".
---

# Git Push via Docker

Use this when the host's `git` binary is a Rust wrapper (e.g. CodeSandbox/VS Code remote environment) that intercepts git operations through a Unix socket and push hangs or fails.

## Detect

Check if host git is broken:

```bash
# Push hangs (exit 124)
timeout 10 git push origin main 2>&1
echo $?  # 124 = timeout

# Or git panics when socket is missing
# "Git remote helper server unix socket not found!"

# strace confirms socket routing
strace -e trace=network git push origin main 2>&1 | grep git.sock
# connect(3, {sa_family=AF_UNIX, sun_path="/var/run/git/git.sock"}, ...)
```

## Push via Docker

Push any branch (or all branches) using a real git inside Docker:

```bash
docker run --rm --entrypoint sh \
  -v $(pwd):/repo \
  alpine/git:latest \
  -c "cd /repo && git push origin <branch>"
```

## Notes

- The Docker container uses a real `git` binary, not the host's Rust wrapper.
- `alpine/git:latest` is small (~20MB) and cached after first pull.
- All git config (user.name, user.email, credential.helper with token) is available to the container via the repo's `.git/config`.
- The token in the remote URL works directly from the container.
- For pushing all branches: `git push origin --all`
