#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

raw_version="$1"
version="${raw_version#v}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

npm test
npm run coverage

file_version="$(
  rg -m1 -n "static _version" WaitForElements.js \
    | perl -nle 'm{"(.*?)"} && do { print $1 }'
)"

if [[ -z "$file_version" ]]; then
  echo "Error: Unable to read WaitForElements._version from WaitForElements.js" >&2
  exit 1
fi

if [[ "$file_version" != "$version" ]]; then
  echo "Error: WaitForElements._version ($file_version) does not match version ($version)" >&2
  exit 1
fi

latest_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"
if [[ -n "$latest_tag" ]]; then
  latest_version="${latest_tag#v}"
  if [[ "$latest_version" == "$version" ]]; then
    echo "Error: version ($version) matches latest tag ($latest_tag)" >&2
    exit 1
  fi
fi

echo "Release checks passed for version $version"
