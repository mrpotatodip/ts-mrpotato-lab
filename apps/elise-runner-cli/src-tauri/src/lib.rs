mod jobs;
mod runner;

use jobs::Activity;
use runner::{PairingOffer, RunnerError, RunnerStatus};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

// Each function below is something the web page can call with `invoke("name")`.
#[tauri::command]
async fn runner_status() -> RunnerStatus {
    runner::status().await
}

#[tauri::command]
async fn pair_runner(code: String) -> Result<PairingOffer, RunnerError> {
    runner::pair(&code).await
}

#[tauri::command]
async fn accept_pairing() -> Result<RunnerStatus, RunnerError> {
    runner::accept_pairing().await
}

#[tauri::command]
async fn decline_pairing() -> Result<RunnerStatus, RunnerError> {
    runner::decline_pairing().await
}

#[tauri::command]
async fn unpair_runner() -> Result<RunnerStatus, RunnerError> {
    runner::unpair().await
}

#[tauri::command]
fn runner_activity() -> Activity {
    jobs::activity()
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![runner_status, pair_runner, accept_pairing, decline_pairing, unpair_runner, runner_activity])
        .setup(|app| {
            // The work loop asks Elise for scans for as long as the app runs.
            tauri::async_runtime::spawn(jobs::work_loop(app.handle().clone()));
            let open =MenuItem::with_id(app, "open", "Open Elise Runner", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;

            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Elise Runner")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        // Closing the window hides it: the Runner keeps running from the tray.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run the Elise Runner");
}
