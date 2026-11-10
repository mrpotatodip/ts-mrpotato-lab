import { ANTHROPIC_API_VERSION, ANTHROPIC_MODELS_URL } from "#/modules/anthropic-key/constants";

// -----
// Asks Anthropic to list one model: free, and it needs a working
// key. true is a key Anthropic accepts, false is one it refuses
// (401 or 403), and anything else (a 5xx, a network failure) throws,
// so an outage is never taken for a bad key.
// -----
export const checkAnthropicKey = async (apiKey: string): Promise<boolean> => {
  const response = await fetch(ANTHROPIC_MODELS_URL, { headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_API_VERSION } });
  if (response.ok) return true;
  if (response.status === 401 || response.status === 403) return false;
  throw new Error(`Anthropic answered ${response.status}`);
};
