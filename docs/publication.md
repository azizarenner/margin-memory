# GitHub source publication

Repository: https://github.com/azizarenner/margin-memory

The remote already contained an initial commit (`bb882b6`) with a README, MIT
license and Python gitignore. The local MVP had three commits. Both histories
were preserved by a merge commit (`2c4d690`), without rebasing or force-pushing.
The merged files retain the remote project description and original copyright
notice, the local implementation and documentation, and both sets of useful
ignore rules. Frontend source paths are explicitly exempted from the Python
`lib/` ignore rule.

The owner completed GitHub CLI browser authentication. Local Git uses that
credential helper for this repository only. No credentials are tracked, and
container data stays in a local volume. Publishing source code does not expose
the locally running app.

The initial 2026-10-12 publication was not performed because local Git
credentials were unavailable. The 2026-10-13 follow-up published the MVP and Docker setup with a normal
fast-forward push after local Docker checks and a secret review. Commit
`5b3d278` includes the verified setup changes; both original histories remain
ancestors of the published main branch.

GitHub Actions runs on pushes and pull requests. Its current result is available
at https://github.com/azizarenner/margin-memory/actions; local verification
results are recorded in verification.md. No public application was deployed.

For later changes, inspect and test them before a normal push:

```sh
git status --short
git diff
git fetch origin
git log --oneline --graph --all -10
# Commit only reviewed source and documentation, then:
git push origin main
```

If a push is rejected because the remote changed, fetch and inspect it. Merge the
new commits rather than overwriting the remote. Never commit `.env`, runtime
databases, personal reading history or credentials. Keep authentication and all
production-hardening work separate from this local-development milestone.
