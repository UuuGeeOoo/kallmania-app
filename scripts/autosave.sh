#!/bin/bash
# Kallmania — work-safety checkpoint
# Commits ALL current work with a meaningful message so no change can be lost
# to a session recycle. Run at the end of EVERY work stage.
cd /home/z/my-project || exit 1

MSG="${1:-Checkpoint: automatic work save}"
if git diff --quiet && git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to save — working tree clean."
  exit 0
fi
git add -A
git commit -m "$MSG" --allow-empty -q
echo "Saved: $(git log --oneline -1)"
echo "Files in this checkpoint: $(git show --stat HEAD | grep -c '|')"
