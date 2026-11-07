import {
  SCAN_SANDBOX_CLONE_TIMEOUT_S,
  SCAN_SANDBOX_KILL_AFTER_S,
  SCAN_SANDBOX_REPO_DIR,
} from "#/modules/scan-sandbox/constants";

export const buildCloneScript = (): string =>
  `rm -rf ${SCAN_SANDBOX_REPO_DIR}; timeout --kill-after=${SCAN_SANDBOX_KILL_AFTER_S} ${SCAN_SANDBOX_CLONE_TIMEOUT_S} git clone --depth 1 -- "$1" ${SCAN_SANDBOX_REPO_DIR}`;
