#!/usr/bin/env bash
# Downloads ACT test case index and HTML fixtures from w3c/wcag-act-rules.
# Run this script to fetch/update raw data, then run the TypeScript processor
# to build the final act-testcases.json:
#
#   scripts/download-act-fixtures.sh
#   npx tsx src/act/download-fixtures.ts

set -euo pipefail

GITHUB_RAW_BASE="https://raw.githubusercontent.com/w3c/wcag-act-rules/main/content-assets/wcag-act-rules"
OUTPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/act-fixtures"
INDEX_FILE="$OUTPUT_DIR/testcases-index.json"
HTML_DIR="$OUTPUT_DIR/html"

mkdir -p "$HTML_DIR"

# 1. Download testcases index
echo "Downloading ACT testcases index..."
curl -sfL --retry 2 --retry-delay 3 --max-time 20 \
  "$GITHUB_RAW_BASE/testcases.json" -o "$INDEX_FILE"
echo "Saved index to $INDEX_FILE"

# 2. Download HTML fixtures for each test case URL in the index
echo "Downloading HTML fixtures..."
downloaded=0
failed=0
skipped=0

# Extract URLs from the index
urls=$(node --input-type=module -e "
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('$INDEX_FILE', 'utf8'));
for (const tc of data.testcases) {
  if (tc.approved) console.log(tc.testcaseId + ' ' + tc.url);
}
")

total=$(echo "$urls" | wc -l | tr -d ' ')

while IFS=' ' read -r id url; do
  dest="$HTML_DIR/$id.html"

  if [ -f "$dest" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  # Rewrite w3.org URLs to raw GitHub URLs
  github_url="${url/https:\/\/www.w3.org\/WAI\/content-assets\/wcag-act-rules\//$GITHUB_RAW_BASE/}"

  if curl -sfL --retry 2 --retry-delay 3 --max-time 20 "$github_url" -o "$dest" 2>/dev/null; then
    downloaded=$((downloaded + 1))
  else
    failed=$((failed + 1))
  fi

  count=$((downloaded + failed + skipped))
  if [ $((count % 100)) -eq 0 ]; then
    echo "  Progress: $count/$total ($downloaded new, $skipped cached, $failed failed)"
  fi
done <<< "$urls"

echo "Done: $downloaded new, $skipped cached, $failed failed (total $total)"
