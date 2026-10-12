# GitHub publication

The GitHub connector was authenticated during implementation, but it exposed no
repository-creation operation, and the GitHub CLI was not installed. No remote
repository was created or pushed. Local Git commits use a generic contributor
identity to avoid publishing personal metadata inadvertently.

After installing GitHub CLI and authenticating, run from this repository root:

```sh
gh auth login
git status --short
git ls-files
# Inspect the list and staged content; .env and runtime databases must be absent.
gh repo create margin-memory --public --source=. --remote=origin --push
```

If the repository name already exists, inspect it before setting a remote or
pushing. Do not overwrite an existing history. Alternatively create an empty
public repository in GitHub's web UI (without an auto-generated README), then:

```sh
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/margin-memory.git
git push -u origin main
```

Initial checks examine tracked content for common credential patterns and
personal-data strings. This is a useful review, not a guarantee that future
changes cannot leak data. Enable GitHub secret scanning, branch protections and
dependency updates when the remote exists. CI status cannot be claimed before
Actions has actually run.
