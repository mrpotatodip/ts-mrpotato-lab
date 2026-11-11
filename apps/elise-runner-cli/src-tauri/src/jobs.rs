// Running a scan on this computer. A loop asks EliseLAB for work every few seconds. When a
// scan was started on this runner, it clones the repository, runs `claude` with the
// person's own login (their Claude subscription), and sends back what the agent wrote.

use crate::runner;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::process::Command;
use tokio::time::{sleep, timeout};

const POLL_EVERY: Duration = Duration::from_secs(5);
const CLONE_TIMEOUT: Duration = Duration::from_secs(300);
const AGENT_TIMEOUT: Duration = Duration::from_secs(40 * 60);
const REPORT_TRIES: u32 = 3;
const ERROR_MAX: usize = 3800;
const LOG_MAX: usize = 190_000;
const FILE_MAX: u64 = 1_900_000;

// What the agent may do. The repository is untrusted, so this is the cloud's "no code
// execution" rule as an allowlist: read the code, run the skill's own validator with node, and
// a few commands that only read. Writing files is allowed by the permission mode below, and
// only inside the scan's own work folder (Claude writes absolute paths, which a path rule here
// did not match). Edit this line to change what a scan may do on this computer.
const ALLOWED_TOOLS: &str = "Read Glob Grep Bash(node ~/.claude/skills:*) Bash(cd:*) Bash(pwd:*) Bash(mkdir:*) Bash(ls:*) Bash(cat:*) Bash(find:*) Bash(wc:*) Bash(head:*) Bash(tail:*) Bash(grep:*) Bash(rg:*) Bash(sed:*) Bash(awk:*) Bash(sort:*) Bash(uniq:*) Bash(cut:*) Bash(tr:*) Bash(echo:*) Bash(git log:*) Bash(git show:*) Bash(git ls-files:*)";

// The same clone the cloud container does: a plain shallow clone, or a fetch of the ref, tried
// as a branch first. It writes the commit, the branch HEAD was on, and how the ref was fetched.
const CLONE_SCRIPT: &str = r#"set -e
rm -rf repo repo.kind
if [ -z "$2" ]; then
  git clone --depth 1 -- "$1" repo
else
  mkdir repo
  git -C repo init -q
  git -C repo remote add origin "$1"
  if git -C repo fetch --depth 1 origin "refs/heads/$2" 2>/dev/null; then
    echo branch > repo.kind
  else
    git -C repo fetch --depth 1 origin "$2"
    echo other > repo.kind
  fi
  git -C repo checkout -q FETCH_HEAD
fi
git -C repo rev-parse HEAD > repo.sha
git -C repo rev-parse --abbrev-ref HEAD > repo.branch
"#;

// What the window shows about the work. Rust keeps it; the page asks for it.
#[derive(Clone, Serialize)]
#[serde(tag = "state", rename_all = "lowercase", rename_all_fields = "camelCase")]
pub enum Activity {
    Idle,
    Running { repo: String },
    Finished { ok: bool, repo: String, message: String },
}

static ACTIVITY: Mutex<Activity> = Mutex::new(Activity::Idle);

pub fn activity() -> Activity {
    ACTIVITY.lock().expect("the activity is not poisoned").clone()
}

fn set_activity(next: Activity) {
    *ACTIVITY.lock().expect("the activity is not poisoned") = next;
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Envelope<T> {
    data: T,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Job {
    scan_id: String,
    repo: String,
    #[serde(rename = "ref")]
    git_ref: Option<String>,
    skill: String,
    model: String,
    effort: String,
    max_budget_usd: f64,
    prompt: String,
    priors_json: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Checkout {
    commit_sha: Option<String>,
    head_branch: Option<String>,
    kind: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Report {
    state: &'static str,
    error: Option<String>,
    checkout: Option<Checkout>,
    agent_log: Option<String>,
    files: BTreeMap<String, String>,
}

enum Claimed {
    Job(Box<Job>),
    Nothing,
    Offline,
    Removed,
}

// -----
// The loop. It runs for as long as the app does and does nothing until the computer is paired.
// -----
pub async fn work_loop(app: AppHandle) {
    loop {
        if let Some(token) = runner::token() {
            match claim(&token).await {
                Claimed::Job(job) => {
                    handle(&app, &token, *job).await;
                    continue;
                }
                Claimed::Removed => runner::forget_token(),
                Claimed::Nothing | Claimed::Offline => {}
            }
        }
        sleep(POLL_EVERY).await;
    }
}

async fn claim(token: &str) -> Claimed {
    let answer = runner::client()
        .post(format!("{}/runners/claim", runner::engine_url()))
        .bearer_auth(token)
        .send()
        .await;
    let Ok(response) = answer else {
        return Claimed::Offline;
    };
    match response.status() {
        StatusCode::OK => match response.json::<Envelope<Option<Job>>>().await {
            Ok(Envelope { data: Some(job) }) => Claimed::Job(Box::new(job)),
            Ok(Envelope { data: None }) => Claimed::Nothing,
            Err(_) => Claimed::Offline,
        },
        StatusCode::UNAUTHORIZED => Claimed::Removed,
        _ => Claimed::Offline,
    }
}

async fn handle(app: &AppHandle, token: &str, job: Job) {
    let label = repo_label(&job.repo);
    set_activity(Activity::Running { repo: label.clone() });

    let work = std::env::temp_dir().join(format!("eliselab-runner-{}", job.scan_id));
    let report = match execute(app, &job, &work).await {
        Ok(report) => report,
        Err(error) => Report {
            state: "failed",
            error: Some(tail(&error, ERROR_MAX)),
            checkout: None,
            agent_log: None,
            files: BTreeMap::new(),
        },
    };
    let ok = report.state == "succeeded";
    let message = report.error.clone().unwrap_or_default();
    let sent = send_report(token, &job.scan_id, &report).await;
    // A finished scan cleans up after itself. A failed one keeps its folder, so the agent's
    // own log can be read.
    if ok && sent {
        let _ = fs::remove_dir_all(&work);
    }

    set_activity(Activity::Finished {
        ok: ok && sent,
        repo: label,
        message: match (ok, sent) {
            (_, false) => "The result could not be sent to EliseLAB.".to_string(),
            (true, true) => "The report was sent to EliseLAB.".to_string(),
            (false, true) => message,
        },
    });
}

async fn send_report(token: &str, scan_id: &str, report: &Report) -> bool {
    for attempt in 1..=REPORT_TRIES {
        let answer = runner::client()
            .post(format!("{}/runners/jobs/{}/result", runner::engine_url(), scan_id))
            .bearer_auth(token)
            .json(report)
            .send()
            .await;
        if let Ok(response) = answer {
            // 404 means the scan ended before this report (it timed out): sending again cannot help.
            if response.status().is_success() || response.status() == StatusCode::NOT_FOUND {
                return response.status().is_success();
            }
        }
        if attempt < REPORT_TRIES {
            sleep(POLL_EVERY).await;
        }
    }
    false
}

// -----
// One scan from clone to report. Every Err is a sentence that goes to the dashboard as the
// scan's error, so it says what to do.
// -----
async fn execute(app: &AppHandle, job: &Job, work: &Path) -> Result<Report, String> {
    if !safe_repo_url(&job.repo) {
        return Err("This runner only clones public https://github.com/owner/name repositories.".into());
    }
    let git_ref = job.git_ref.clone().unwrap_or_default();
    if !git_ref.is_empty() && !safe_ref(&git_ref) {
        return Err("That branch, tag or commit name is not one this runner will fetch.".into());
    }
    if !job.scan_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("The scan id is not one this runner will use.".into());
    }
    let skill_dir = match job.skill.as_str() {
        "lite" => "security-audit-lite",
        "full" => "security-audit",
        other => return Err(format!("This runner does not know the \"{other}\" audit.")),
    };

    let _ = fs::remove_dir_all(work);
    fs::create_dir_all(work.join("out")).map_err(|e| format!("Could not make a work folder: {e}"))?;
    if !job.priors_json.is_empty() {
        fs::write(work.join("prior-findings.json"), &job.priors_json).map_err(|e| format!("Could not save the earlier findings: {e}"))?;
    }

    clone_repo(work, &job.repo, &git_ref).await?;
    for name in [".claude", "CLAUDE.md", "CLAUDE.local.md", ".mcp.json"] {
        let path = work.join("repo").join(name);
        let _ = fs::remove_dir_all(&path);
        let _ = fs::remove_file(&path);
    }

    install_skill(app, skill_dir)?;
    run_agent(work, job).await?;
    collect(work)
}

async fn clone_repo(work: &Path, repo: &str, git_ref: &str) -> Result<(), String> {
    let mut command = Command::new("sh");
    command
        .arg("-c")
        .arg(CLONE_SCRIPT)
        .arg("sh")
        .arg(repo)
        .arg(git_ref)
        .current_dir(work)
        .env("GIT_ALLOW_PROTOCOL", "https")
        .env("GIT_TERMINAL_PROMPT", "0")
        .kill_on_drop(true);
    let output = timeout(CLONE_TIMEOUT, command.output())
        .await
        .map_err(|_| "Cloning took longer than 5 minutes.".to_string())?
        .map_err(|e| format!("Could not run git: {e}. Is Git installed on this computer?"))?;
    if output.status.success() {
        return Ok(());
    }
    Err(format!("git could not read the repository: {}", String::from_utf8_lossy(&output.stderr)))
}

// -----
// The skill's own instructions run its validator at ~/.claude/skills/<name>, so the bundled
// copy goes there, as in the container. A copy that is already there is replaced.
// -----
fn install_skill(app: &AppHandle, skill_dir: &str) -> Result<(), String> {
    let source = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Could not find the audit skill inside the app: {e}"))?
        .join("skills")
        .join(skill_dir);
    let home = std::env::var("HOME").map_err(|_| "Could not find your home folder.".to_string())?;
    let target = PathBuf::from(home).join(".claude").join("skills").join(skill_dir);
    let _ = fs::remove_dir_all(&target);
    copy_dir(&source, &target).map_err(|e| format!("Could not install the audit skill from {}: {e}", source.display()))
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

// -----
// A program started from an app does not get the shell's PATH, so `claude` is looked for in
// the usual places and then asked of a login shell. The child gets the folder `claude` lives
// in on its PATH, because claude itself starts `node` from there.
// -----
fn find_claude() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    let mut candidates: Vec<PathBuf> = vec![
        PathBuf::from(&home).join(".claude/local/claude"),
        PathBuf::from(&home).join(".local/bin/claude"),
        PathBuf::from(&home).join(".npm-global/bin/claude"),
        PathBuf::from("/opt/homebrew/bin/claude"),
        PathBuf::from("/usr/local/bin/claude"),
    ];
    if let Ok(versions) = fs::read_dir(PathBuf::from(&home).join(".nvm/versions/node")) {
        candidates.extend(versions.flatten().map(|v| v.path().join("bin/claude")));
    }
    if let Some(found) = candidates.into_iter().find(|p| p.is_file()) {
        return Some(found);
    }
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = std::process::Command::new(shell).args(["-ilc", "command -v claude"]).output().ok()?;
    let line = String::from_utf8_lossy(&output.stdout).lines().last()?.trim().to_string();
    let path = PathBuf::from(line);
    path.is_file().then_some(path)
}

async fn run_agent(work: &Path, job: &Job) -> Result<(), String> {
    let claude = find_claude().ok_or("Claude Code is not installed on this computer, or this app cannot find it. Install it from https://claude.com/claude-code and sign in, then start the scan again.")?;
    let bin_dir = claude.parent().map(Path::to_path_buf).unwrap_or_default();
    let path = format!("{}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin", bin_dir.display());

    let log = fs::File::create(work.join("agent.log")).map_err(|e| format!("Could not open the agent log: {e}"))?;
    let err = fs::File::create(work.join("agent.err")).map_err(|e| format!("Could not open the agent log: {e}"))?;
    let mut command = Command::new(&claude);
    command
        .args(["--print", "--output-format", "json", "--no-session-persistence", "--setting-sources", "user"])
        .args(["--model", &job.model, "--effort", &job.effort, "--max-budget-usd", &job.max_budget_usd.to_string()])
        .args(["--permission-mode", "acceptEdits"])
        .args(["--allowedTools", ALLOWED_TOOLS])
        .arg("--")
        .arg(&job.prompt)
        .current_dir(work)
        .env("PATH", path)
        // The person's own login does the work. A key in the environment would be used instead.
        .env_remove("ANTHROPIC_API_KEY")
        .env_remove("ANTHROPIC_AUTH_TOKEN")
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(err))
        .kill_on_drop(true);
    let mut child = command.spawn().map_err(|e| format!("Could not start Claude Code: {e}"))?;

    let status = match timeout(AGENT_TIMEOUT, child.wait()).await {
        Ok(status) => status.map_err(|e| format!("Claude Code stopped unexpectedly: {e}"))?,
        Err(_) => {
            let _ = child.kill().await;
            return Err("The audit ran longer than 40 minutes, so this runner stopped it.".into());
        }
    };
    if status.success() {
        return Ok(());
    }
    let stderr = fs::read_to_string(work.join("agent.err")).unwrap_or_default();
    let stdout = fs::read_to_string(work.join("agent.log")).unwrap_or_default();
    Err(format!("claude exited {}: {} {}", status.code().unwrap_or(-1), tail(stderr.trim(), 1500), tail(stdout.trim(), 1500)))
}

fn read_trimmed(path: PathBuf) -> Option<String> {
    let text = fs::read_to_string(path).ok()?;
    let text = text.trim();
    (!text.is_empty()).then(|| text.to_string())
}

// -----
// What the agent wrote, and what git said about the clone.
// -----
fn collect(work: &Path) -> Result<Report, String> {
    let mut files = BTreeMap::new();
    for entry in fs::read_dir(work.join("out")).map_err(|e| format!("Could not read the audit's output: {e}"))?.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let ok_name = !name.is_empty() && name.len() <= 80 && name.chars().all(|c| c.is_ascii_alphanumeric() || "._-".contains(c));
        let small = entry.metadata().map(|m| m.is_file() && m.len() <= FILE_MAX).unwrap_or(false);
        if ok_name && small {
            if let Ok(text) = fs::read_to_string(entry.path()) {
                files.insert(name, text);
            }
        }
    }
    if !files.contains_key("REPORT.md") {
        let log = fs::read_to_string(work.join("agent.log")).unwrap_or_default();
        let err = fs::read_to_string(work.join("agent.err")).unwrap_or_default();
        return Err(format!(
            "The audit finished without writing REPORT.md. The agent was probably stopped by a permission. Agent output: {} {}",
            tail(err.trim(), 600),
            tail(log.trim(), 2400)
        ));
    }
    let agent_log = fs::read_to_string(work.join("agent.log")).ok().map(|log| tail(log.trim(), LOG_MAX));
    Ok(Report {
        state: "succeeded",
        error: None,
        checkout: Some(Checkout {
            commit_sha: read_trimmed(work.join("repo.sha")),
            head_branch: read_trimmed(work.join("repo.branch")),
            kind: read_trimmed(work.join("repo.kind")),
        }),
        agent_log,
        files,
    })
}

// -----
// The last `max` characters, so a long log keeps its end, where the error is.
// -----
fn tail(text: &str, max: usize) -> String {
    let count = text.chars().count();
    if count <= max {
        return text.to_string();
    }
    text.chars().skip(count - max).collect()
}

fn repo_label(url: &str) -> String {
    url.trim_start_matches("https://github.com/").trim_end_matches('/').trim_end_matches(".git").to_string()
}

// Only a public GitHub repository over https: a forged answer must not make this computer
// clone from somewhere else or run a git transport that executes commands.
fn safe_repo_url(url: &str) -> bool {
    let Some(rest) = url.strip_prefix("https://github.com/") else {
        return false;
    };
    let rest = rest.trim_end_matches('/');
    let rest = rest.strip_suffix(".git").unwrap_or(rest);
    let mut parts = rest.split('/');
    let part_ok = |part: &str| !part.is_empty() && part.chars().all(|c| c.is_ascii_alphanumeric() || "._-".contains(c));
    match (parts.next(), parts.next(), parts.next()) {
        (Some(owner), Some(name), None) => part_ok(owner) && part_ok(name),
        _ => false,
    }
}

fn safe_ref(name: &str) -> bool {
    !name.is_empty() && name.len() <= 200 && !name.starts_with('-') && name.chars().all(|c| c.is_ascii_alphanumeric() || "._/-".contains(c))
}
