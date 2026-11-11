import {
  SCAN_SANDBOX_BRANCH_FILE,
  SCAN_SANDBOX_CLONE_TIMEOUT_S,
  SCAN_SANDBOX_COMMIT_FILE,
  SCAN_SANDBOX_KILL_AFTER_S,
  SCAN_SANDBOX_KIND_FILE,
  SCAN_SANDBOX_REPO_DIR,
} from "#/modules/scan-sandbox/constants";

const GUARD = `timeout --kill-after=${SCAN_SANDBOX_KILL_AFTER_S} ${SCAN_SANDBOX_CLONE_TIMEOUT_S}`;

// -----
// $1 is the repo URL and $2 an optional ref. Without a ref it
// is the plain shallow clone, and the branch it is on is written
// to a file. With one, the script fetches refs/heads/$2 first, so
// a branch wins over a tag with the same name, and falls back to
// $2 as typed (a tag, or a commit that no branch points at).
// repo.kind says which worked: branch or other. The commit that
// was read is written to a file either way.
// -----
export const buildCloneScript = (): string =>
  [
    "set -e;",
    `rm -rf ${SCAN_SANDBOX_REPO_DIR};`,
    `if [ -z "$2" ]; then ${GUARD} git clone --depth 1 -- "$1" ${SCAN_SANDBOX_REPO_DIR};`,
    `else mkdir ${SCAN_SANDBOX_REPO_DIR} && cd ${SCAN_SANDBOX_REPO_DIR} && git init -q && git remote add origin "$1" && if ${GUARD} git fetch --depth 1 origin "refs/heads/$2" 2>/dev/null; then echo branch > ${SCAN_SANDBOX_KIND_FILE}; else ${GUARD} git fetch --depth 1 origin "$2" && echo other > ${SCAN_SANDBOX_KIND_FILE}; fi && git checkout -q FETCH_HEAD; fi;`,
    `git -C ${SCAN_SANDBOX_REPO_DIR} rev-parse HEAD > ${SCAN_SANDBOX_COMMIT_FILE};`,
    `git -C ${SCAN_SANDBOX_REPO_DIR} rev-parse --abbrev-ref HEAD > ${SCAN_SANDBOX_BRANCH_FILE}`,
  ].join(" ");
