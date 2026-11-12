// Pairing with Elise. The web page never talks to the API and never sees the token:
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
    // Elise no longer knows the token: the runner was removed.
    Revoked,
    // A token is saved, but Elise could not be reached.
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

// Asks Elise who this runner is. Also the proof that the pairing still works.
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

// Trades a pairing code for a token and keeps the token in the keychain.
pub async fn pair(code: &str) -> Result<RunnerStatus, RunnerError> {
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
    keychain_entry()
        .and_then(|entry| entry.set_password(&enrolled.token))
        .map_err(|_| RunnerError::KeychainFailed)?;
    remember_token(&enrolled.token);
    Ok(RunnerStatus::Connected {
        name: enrolled.name,
        account_name: enrolled.account_name,
    })
}

// Tells Elise to stop trusting this runner, then forgets the token. If Elise cannot
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
    // 401 means Elise already dropped it, which is what we wanted.
    match response.status() {
        StatusCode::OK | StatusCode::UNAUTHORIZED => {
            forget_token();
            Ok(RunnerStatus::Unpaired)
        }
        _ => Err(RunnerError::Unreachable),
    }
}
