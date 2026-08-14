#!/usr/bin/env bash
set -euo pipefail

# Build the two pages that live in hero-lab/ and put them where the site
# serves them from.
#
#   / and /new-home  ← hero-lab/dist-new-home  → public/new-home
#   /card            ← hero-lab/dist-card      → public/card
#
# This was a copy-paste step for a while, and a failed build still left the
# previous bundle sitting in public/ looking like a successful one. `set -e`
# means a build that fails stops here instead.
#
#   ./scripts/build-pages.sh

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root/hero-lab"

[ -d node_modules ] || npm ci

npm run build        # the page
npm run build:card   # the card

for target in new-home card; do
  src="$root/hero-lab/dist-$target"
  dest="$root/public/$target"
  [ -d "$src" ] || { echo "missing $src"; exit 1; }
  rm -rf "$dest"
  cp -R "$src" "$dest"
  echo "→ public/$target"
done

echo
echo "Built. Commit public/new-home and public/card, then push to deploy."
