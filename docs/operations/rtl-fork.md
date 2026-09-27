# Maintaining the RTL fork

`newer97/t3code` keeps upstream PR [#10779](https://github.com/pingdotgg/t3code/pull/10779)
merged into `main`. A scheduled ChatGPT task can check upstream daily, resolve
merge conflicts, verify the RTL behavior, and push the result to the fork. To
sync locally:

```sh
git switch main
git pull --ff-only origin main
git fetch upstream main
git merge upstream/main
# Resolve any conflicts and run the focused tests before pushing.
git push origin main
```

If the checkout has no `upstream` remote, add it with
`git remote add upstream https://github.com/pingdotgg/t3code.git`.
Pushing to the fork's `main` starts **Fork macOS Release** automatically. It
runs RTL regression tests, packaging unit tests, and web/mobile typechecks
before building an Apple Silicon DMG. You can also run it manually with
`gh workflow run fork-release.yml --repo newer97/t3code --ref main`. Add
`[skip release]` to a commit message when a push should not create an installer.
It signs and notarizes using the Shaden Alawaji team (`XF983AFG67`) and the
fork's bundle identifier `dev.snaya.t3code`. Signing credentials live in
GitHub Actions secrets; the Team ID is a repository variable.

Releases use the normal `vX.Y.Z-nightly.YYYYMMDD.RUN` tags and include the
DMG, ZIP, blockmaps, and `nightly-mac.yml` update manifest. **T3 Code (Nightly)
RTL** checks `newer97/t3code` for updates on the Nightly track. Install the first
signed DMG manually; subsequent releases use the normal download/restart button.
Keep the updater on Nightly; this fork publishes no stable channel.

These releases include the bundled server but do not publish standalone CLI
runtime archives. Upstream now installs remote runtimes from release archives;
separately installed remote servers must be maintained independently rather
than updated to this fork's desktop version.
Native T3 Connect passkeys require upstream to authorize this team's application
on its associated domain. The upstream authentication code is unchanged.

Upstream deployment and publishing workflows are disabled in this fork's
GitHub Actions settings. Keep them disabled when syncing; they depend on
upstream infrastructure and publishing credentials.

After the RTL change merges upstream, merge upstream again and resolve any
duplicate changes. The fork release workflow and signing identity remain
independent of whether the RTL patch has landed upstream.
