# Releasing

Releases are built by GitHub Actions (`.github/workflows/release.yml`) whenever a tag
starting with `v` is pushed. The workflow builds the portable exe on Windows and
attaches it to a GitHub release with generated notes.

## Make a release

1. Make sure the **CI** checks on `main` are green.
2. Check the version. `package.json` says `2.0.0` for the first release, so there is
   nothing to change. For a later release, set the new version (this also updates
   `package-lock.json`) and commit it:
   ```bash
   npm version 2.1.0 --no-git-tag-version
   git add package.json package-lock.json
   git commit -m "chore: release 2.1.0"
   ```
3. Tag it and push the tag:
   ```bash
   git tag v2.0.0
   git push origin main --tags
   ```
4. Open the **Actions** tab, wait for the *Release* run, then find the exe under
   **Releases**. Edit the release notes there if you like.

The exe is named after `package.json`'s version, so the tag and the version should match.

## Build on your own computer

```bash
npm run build:win
```

The exe appears in `dist/` as `Shelf-<version>-portable.exe`.

## If something goes wrong

- **"Cannot create symbolic link ... A required privilege is not held by the client"**
  while building on Windows: turn on *Developer Mode* (Settings, Privacy & security,
  For developers), or run the terminal as administrator once, then build again.
- **Windows SmartScreen warns about the exe**: it is not code-signed (certificates are paid).
  Use *More info*, then *Run anyway*.
- **The portable exe starts slowly**: it unpacks itself to a temporary folder on every launch.
  That is how portable builds work.
