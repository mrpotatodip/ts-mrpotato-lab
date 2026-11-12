// Pairing with EliseLAB. The web page never talks to the API and never sees the token:
// it asks these functions, which call the API from Rust and keep the token in the
// computer's keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).

use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Duration;

const ENGINE_URL: &str = "https://api.eliselab.com";
const KEYCHAIN_SERVICE: &str = "com.eliselab.runner";
const KEYCHAIN_USER: &str = "runner-token";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);

// A debug build (`pnpm app:dev`) may point at another API with ELISE_ENGINE_URL.
// A release build cannot: the token only ever goes to api.eliselab.com.
pub(crate) fn engine_url() -> String {
    #[cfg(debug_assertions)]
    if let Ok(url) = std::env::var("ELISE_ENGINE_URL") {
        return url.trim_end_matches('/').to_string();
    }
    ENGINE_URL.to_string()
}

// What the page shows. The page gets `{ "state": "connected", "name": ..., "accountName": ... }`.
#[derive(Serialize)]
#[serde(tag = "state", rename_all = "lowercase", rename_all_fields = "camelCase")]
pub enum RunnerStatus {
    // No token on this computer.
    Unpaired,
    // EliseLAB no longer knows the token: the runner was removed.
    Revoked,
    // A token is saved, but EliseLAB could not be reached.
    Offline,
    Connected { name: String, account_name: String },
}

// Why pairing or disconnecting failed. The page turns each code into a sentence.
#[derive(Serialize)]
#[serde(tag = "code", rename_all = "snake_case")]
pub enum RunnerError {
    InvalidCode,
    Unreachable,
    KeychainFailed,
    // Accepting a pairing that is not waiting: the app was restarted, or it was answered twice.
    PairingLost,
}

// What the page is asked to confirm: the account that made the code and the name it gave this
// runner. The token stays in Rust.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairingOffer {
    pub name: String,
    pub account_name: String,
}

// A token EliseLAB has issued that the person has not accepted yet. It lives in memory only:
// it is not in the keychain, so the work loop cannot use it, and quitting the app loses it.
struct Pending {
    token: String,
    name: String,
    account_name: String,
}

static PENDING: Mutex<Option<Pending>> = Mutex::new(None);

fn take_pending() -> Option<Pending> {
    PENDING.lock().expect("the pending pairing is not poisoned").take()
}

// The API wraps every answer as { data, error }.
#[derive(Deserialize)]
struct Envelope<T> {
    data: T,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Identity {
    name: String,
    account_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Enrolled {
    name: String,
    account_name: String,
    token: String,
}

#[derive(Serialize)]
struct EnrollBody<'a> {
    code: &'a str,
}

pub(crate) fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .expect("the HTTP client settings are valid")
}

fn keychain_entry() -> keyring::Result<keyring::Entry> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
}

// The token is read from the keychain once and kept in memory: the work loop asks for it
// every few seconds, and a keychain read each time would be slow and may prompt.
static TOKEN_CACHE: Mutex<Option<String>> = Mutex::new(None);

pub(crate) fn token() -> Option<String> {
    let mut cached = TOKEN_CACHE.lock().expect("the token cache is not poisoned");
    if cached.is_none() {
        *cached = keychain_entry().ok().and_then(|entry| entry.get_password().ok());
    }
    cached.clone()
}

fn remember_token(token: &str) {
    *TOKEN_CACHE.lock().expect("the token cache is not poisoned") = Some(token.to_string());
}

pub(crate) fn forget_token() {
    *TOKEN_CACHE.lock().expect("the token cache is not poisoned") = None;
    if let Ok(entry) = keychain_entry() {
        let _ = entry.delete_credential();
    }
}

// Asks EliseLAB who this runner is. Also the proof that the pairing still works.
pub async fn status() -> RunnerStatus {
    let Some(token) = token() else {
        return RunnerStatus::Unpaired;
    };
    let answer = client()
        .get(format!("{}/runners/me", engine_url()))
        .bearer_auth(&token)
        .send()
        .await;
    let Ok(response) = answer else {
        return RunnerStatus::Offline;
    };
    match response.status() {
        StatusCode::OK => match response.json::<Envelope<Identity>>().await {
            Ok(envelope) => RunnerStatus::Connected {
                name: envelope.data.name,
                account_name: envelope.data.account_name,
            },
            Err(_) => RunnerStatus::Offline,
        },
        StatusCode::UNAUTHORIZED => {
            forget_token();
            RunnerStatus::Revoked
        }
        _ => RunnerStatus::Offline,
    }
}

// Trades a pairing code for a token and holds it until the person accepts the account it
// belongs to (`accept_pairing`). A code can be handed to someone by a stranger, so the token is
// not kept, and no scan can run, before the person has seen whose account this computer joins.
pub async fn pair(code: &str) -> Result<PairingOffer, RunnerError> {
    let response = client()
        .post(format!("{}/runners/enroll", engine_url()))
        .json(&EnrollBody { code })
        .send()
        .await
        .map_err(|_| RunnerError::Unreachable)?;
    match response.status() {
        StatusCode::OK => {}
        // 400 is a code that is not even the right shape; 403 is wrong, used or expired.
        StatusCode::FORBIDDEN | StatusCode::BAD_REQUEST => return Err(RunnerError::InvalidCode),
        _ => return Err(RunnerError::Unreachable),
    }
    let enrolled = response
        .json::<Envelope<Enrolled>>()
        .await
        .map_err(|_| RunnerError::Unreachable)?
        .data;
    let offer = PairingOffer {
        name: enrolled.name.clone(),
        account_name: enrolled.account_name.clone(),
    };
    // A second code entered before the first was answered replaces it; the first is revoked.
    let earlier = PENDING.lock().expect("the pending pairing is not poisoned").replace(Pending {
        token: enrolled.token,
        name: enrolled.name,
        account_name: enrolled.account_name,
    });
    if let Some(earlier) = earlier {
        revoke(&earlier.token).await;
    }
    Ok(offer)
}

// Tells EliseLAB to stop trusting a token. True when it did, or already had.
async fn revoke(token: &str) -> bool {
    match client().delete(format!("{}/runners/me", engine_url())).bearer_auth(token).send().await {
        Ok(response) => response.status().is_success() || response.status() == StatusCode::UNAUTHORIZED,
        Err(_) => false,
    }
}

// The person accepted the account: the token goes to the keychain and the work loop may use it.
pub async fn accept_pairing() -> Result<RunnerStatus, RunnerError> {
    let pending = take_pending().ok_or(RunnerError::PairingLost)?;
    let saved = keychain_entry().and_then(|entry| entry.set_password(&pending.token));
    if saved.is_err() {
        revoke(&pending.token).await;
        return Err(RunnerError::KeychainFailed);
    }
    remember_token(&pending.token);
    Ok(RunnerStatus::Connected {
        name: pending.name,
        account_name: pending.account_name,
    })
}

// The person refused. EliseLAB is told to drop the token; if it cannot be reached the token
// is dropped here anyway, and a token nobody holds works for nobody. The runner then shows in
// the account's list until an admin removes it.
pub async fn decline_pairing() -> Result<RunnerStatus, RunnerError> {
    if let Some(pending) = take_pending() {
        revoke(&pending.token).await;
    }
    Ok(RunnerStatus::Unpaired)
}

// Tells EliseLAB to stop trusting this runner, then forgets the token. If EliseLAB cannot
// be reached the token is kept, so a copy of it is never left alive without a way to retry.
pub async fn unpair() -> Result<RunnerStatus, RunnerError> {
    let Some(token) = token() else {
        return Ok(RunnerStatus::Unpaired);
    };
    let response = client()
        .delete(format!("{}/runners/me", engine_url()))
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|_| RunnerError::Unreachable)?;
    // 401 means EliseLAB already dropped it, which is what we wanted.
    match response.status() {
        StatusCode::OK | StatusCode::UNAUTHORIZED => {
            forget_token();
            Ok(RunnerStatus::Unpaired)
        }
        _ => Err(RunnerError::Unreachable),
    }
}
