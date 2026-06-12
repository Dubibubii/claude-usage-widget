// Tauri shell for the Glass Instrument widget.
//
// Native data bridge — mirrors the Vite dev endpoints (/api/*) so the
// frontend's data layer works identically in both builds:
//   read_capture     ← ~/.claude/usage-widget/statusline-latest.json
//   list_transcripts / read_transcript ← ~/.claude/projects/**/*.jsonl
//   usage_log_meta / write_usage_log  ← ~/Documents/claude-usage.md
//
// TODO (spec §9, macOS polish): true above-fullscreen behavior needs an
// NSPanel with .canJoinAllSpaces + .fullScreenAuxiliary at status-bar window
// level (e.g. the tauri-nspanel plugin) plus a non-activating style mask so
// clicks never steal focus from the frontmost app. Windows: WS_EX_NOACTIVATE.
// TODO: tray icon (quit + re-run setup) — spec §9.

use serde::Serialize;
use std::{
    env, fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

fn home_dir() -> PathBuf {
    PathBuf::from(
        env::var("HOME")
            .or_else(|_| env::var("USERPROFILE"))
            .unwrap_or_default(),
    )
}

fn capture_path() -> PathBuf {
    home_dir().join(".claude/usage-widget/statusline-latest.json")
}

fn projects_dir() -> PathBuf {
    home_dir().join(".claude/projects")
}

fn log_path() -> PathBuf {
    home_dir().join("Documents/claude-usage.md")
}

fn mtime_ms(p: &Path) -> u64 {
    fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[derive(Serialize)]
struct FileOut {
    mtime_ms: u64,
    content: String,
}

#[tauri::command]
fn read_capture() -> Option<FileOut> {
    let p = capture_path();
    let content = fs::read_to_string(&p).ok()?;
    Some(FileOut {
        mtime_ms: mtime_ms(&p),
        content,
    })
}

#[tauri::command]
fn list_transcripts() -> Vec<String> {
    fn walk(dir: &Path, out: &mut Vec<String>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for e in entries.flatten() {
                let p = e.path();
                if p.is_dir() {
                    walk(&p, out);
                } else if p.extension().is_some_and(|x| x == "jsonl") {
                    if let Some(s) = p.to_str() {
                        out.push(s.to_string());
                    }
                }
            }
        }
    }
    let mut out = Vec::new();
    walk(&projects_dir(), &mut out);
    out
}

#[tauri::command]
fn read_transcript(path: String) -> Option<String> {
    let p = PathBuf::from(&path);
    // only the transcript tree is readable through this command
    if !p.starts_with(projects_dir()) {
        return None;
    }
    fs::read_to_string(p).ok()
}

#[tauri::command]
fn read_account() -> Option<serde_json::Value> {
    let p = home_dir().join(".claude.json");
    let cfg: serde_json::Value = serde_json::from_str(&fs::read_to_string(p).ok()?).ok()?;
    let acct = cfg.get("oauthAccount")?;
    Some(serde_json::json!({
        "rateLimitTier": acct.get("userRateLimitTier").filter(|v| !v.is_null())
            .or_else(|| acct.get("organizationRateLimitTier")).cloned(),
        "organizationType": acct.get("organizationType").cloned(),
        "subscriptionCreatedAt": acct.get("subscriptionCreatedAt").cloned(),
        "hasExtraUsageEnabled": acct.get("hasExtraUsageEnabled").cloned(),
    }))
}

#[derive(Serialize)]
struct LogMetaOut {
    path: String,
    mtime_ms: u64,
    content: Option<String>,
}

#[tauri::command]
fn usage_log_meta(with_content: bool) -> Option<LogMetaOut> {
    let p = log_path();
    let content = fs::read_to_string(&p).ok()?;
    Some(LogMetaOut {
        path: p.to_string_lossy().into_owned(),
        mtime_ms: mtime_ms(&p),
        content: with_content.then_some(content),
    })
}

/// Overwrite the report file with regenerated content (the frontend builds
/// the whole current-month report each time — append-free by design).
#[tauri::command]
fn write_usage_log(content: String) -> Result<(), String> {
    let p = log_path();
    if let Some(dir) = p.parent() {
        let _ = fs::create_dir_all(dir);
    }
    fs::write(&p, content).map_err(|e| e.to_string())
}

/// Save a small text artifact (e.g. an exported skill .md) to ~/Downloads.
/// Filename is sanitized to a single path component; wry can't do <a download>.
#[tauri::command]
fn save_text_file(filename: String, content: String) -> Result<String, String> {
    let safe: String = filename
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        .collect();
    if safe.is_empty() || safe.starts_with('.') {
        return Err("bad filename".into());
    }
    let dir = home_dir().join("Downloads");
    let _ = fs::create_dir_all(&dir);
    let p = dir.join(safe);
    fs::write(&p, content).map_err(|e| e.to_string())?;
    Ok(p.to_string_lossy().into_owned())
}

/// `<binary> --statusline` — Claude Code statusline mode (no GUI).
/// Cross-platform replacement for the bash shim: reads the session JSON from
/// stdin, captures it for the widget, prints a status line. Register in
/// ~/.claude/settings.json as:
///   "statusLine": { "type": "command", "command": "/path/to/binary --statusline" }
pub fn run_statusline() {
    use std::io::Read;

    let mut input = String::new();
    if std::io::stdin().read_to_string(&mut input).is_err() || input.is_empty() {
        println!("Claude");
        return;
    }

    // capture (atomic) — this is the critical path the widget reads
    let dir = home_dir().join(".claude/usage-widget");
    let _ = fs::create_dir_all(&dir);
    let tmp = dir.join("statusline-latest.json.tmp");
    let dst = dir.join("statusline-latest.json");
    if fs::write(&tmp, &input).is_ok() {
        let _ = fs::rename(&tmp, &dst);
    }

    // optional user statusline chain: its command gets the same JSON on stdin
    let chain = dir.join("chain.cmd");
    if let Ok(cmd) = fs::read_to_string(&chain) {
        use std::io::Write;
        use std::process::{Command, Stdio};
        #[cfg(target_os = "windows")]
        let mut child = Command::new("cmd").args(["/C", cmd.trim()]).stdin(Stdio::piped()).spawn();
        #[cfg(not(target_os = "windows"))]
        let mut child = Command::new("sh").args(["-c", cmd.trim()]).stdin(Stdio::piped()).spawn();
        if let Ok(ref mut c) = child {
            if let Some(stdin) = c.stdin.as_mut() {
                let _ = stdin.write_all(input.as_bytes());
            }
            let _ = c.wait();
            return;
        }
    }

    // default display: "Model · 5h X% · wk Y%"
    let v: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let model = v
        .pointer("/model/display_name")
        .and_then(|m| m.as_str())
        .unwrap_or("Claude");
    let mut line = model.to_string();
    for (key, label) in [("five_hour", "5h"), ("seven_day", "wk")] {
        if let Some(pct) = v
            .pointer(&format!("/rate_limits/{key}/used_percentage"))
            .and_then(|p| p.as_f64())
        {
            line.push_str(&format!(" · {label} {}%", pct.round() as i64));
        }
    }
    println!("{line}");
}

/// Frontend keeps the menu-bar title in sync with the primary meter
/// (macOS shows it next to the clock — the menu bar becomes a mini-meter).
#[tauri::command]
fn set_tray_title(app: tauri::AppHandle, title: String) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_title(Some(title));
    }
}

/// Self-test gate: launching the binary with CUW_SELFTEST=1 makes the
/// frontend run a scripted drag/snap/expand suite against the real OS window
/// and write PASS/FAIL lines to widget-errors.log. Off in normal runs.
#[tauri::command]
fn is_selftest() -> bool {
    std::env::var("CUW_SELFTEST").is_ok()
}

/// Desktop-blur material, panel mode only (see setup note). Guarded so
/// repeated calls never stack NSVisualEffectViews.
#[cfg(target_os = "macos")]
static VIBRANCY_ON: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[tauri::command]
fn set_vibrancy(app: tauri::AppHandle, enabled: bool) {
    #[cfg(target_os = "macos")]
    {
        use std::sync::atomic::Ordering;
        use tauri::Manager;
        if VIBRANCY_ON.swap(enabled, Ordering::SeqCst) == enabled {
            return; // no change
        }
        if let Some(w) = app.get_webview_window("main") {
            if enabled {
                let _ = window_vibrancy::apply_vibrancy(
                    &w,
                    window_vibrancy::NSVisualEffectMaterial::Popover,
                    Some(window_vibrancy::NSVisualEffectState::Active),
                    Some(18.0), // = panel radius, fills the window exactly
                );
            } else {
                let _ = window_vibrancy::clear_vibrancy(&w);
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, enabled);
    }
}

/// Crash/error telemetry → local file, so webview failures are diagnosable
/// (a crashed transparent webview is otherwise just an invisible window).
#[tauri::command]
fn log_error(message: String) {
    use std::io::Write;
    let dir = home_dir().join(".claude/usage-widget");
    let _ = fs::create_dir_all(&dir);
    if let Ok(mut f) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(dir.join("widget-errors.log"))
    {
        let ts = std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let _ = writeln!(f, "[{ts}] {}", message.chars().take(2000).collect::<String>());
    }
}

/// Open a URL in the default browser. wry blocks window.open inside the
/// webview, so checkout/links route through here. https only.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err("only https urls".into());
    }
    #[cfg(target_os = "macos")]
    let result = std::process::Command::new("open").arg(&url).spawn();
    #[cfg(target_os = "windows")]
    let result = std::process::Command::new("cmd").args(["/C", "start", "", &url]).spawn();
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let result = std::process::Command::new("xdg-open").arg(&url).spawn();
    result.map(|_| ()).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_capture,
            list_transcripts,
            read_transcript,
            usage_log_meta,
            write_usage_log,
            save_text_file,
            read_account,
            set_tray_title,
            open_url,
            log_error,
            is_selftest,
            set_vibrancy
        ])
        .setup(|app| {
            // background-agent app: no Dock icon, no Cmd+Tab entry (spec §9).
            // CUW_DOCK=1 keeps a Dock presence — used ONLY for automated
            // input testing (computer-use can't target a nameless agent app).
            #[cfg(target_os = "macos")]
            if std::env::var("CUW_DOCK").is_err() {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // NOTE: vibrancy is PANEL-ONLY (set_vibrancy cmd, driven by the
            // frontend's window-mode sync). Window-level blur fills the whole
            // rectangular window, which read as a frost slab behind the
            // tooltip and a faint square around the pill (user reports).
            // The panel fills its window exactly (radius 18 = vibrancy 18),
            // so the material is artifact-free there.
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    // float above FULLSCREEN apps (spec §9): status-bar window
                    // level + join-all-spaces/fullscreen-auxiliary behavior —
                    // plain alwaysOnTop only floats within the normal Space
                    if let Ok(ns_ptr) = window.ns_window() {
                        use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
                        let ns: &NSWindow = unsafe { &*(ns_ptr as *const NSWindow) };
                        ns.setLevel(25); // NSStatusWindowLevel
                        ns.setCollectionBehavior(
                            NSWindowCollectionBehavior::CanJoinAllSpaces
                                | NSWindowCollectionBehavior::FullScreenAuxiliary
                                | NSWindowCollectionBehavior::Stationary,
                        );
                    }
                }
            }

            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;
            use tauri::{Emitter, Manager};

            let toggle = MenuItem::with_id(app, "toggle", "Show / Hide Widget", true, None::<&str>)?;
            let setup = MenuItem::with_id(app, "setup", "Re-run Setup", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &setup, &quit])?;

            // menu-bar item: template donut icon + live % title (a text-only
            // NSStatusItem can render zero-width — always provide an icon)
            TrayIconBuilder::with_id("main-tray")
                .icon(tauri::image::Image::from_bytes(include_bytes!(
                    "../icons/tray-icon.png"
                ))?)
                .icon_as_template(true)
                .title("–")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(w) = app.get_webview_window("main") {
                            if w.is_visible().unwrap_or(false) {
                                let _ = w.hide();
                            } else {
                                let _ = w.show();
                            }
                        }
                    }
                    "setup" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.emit("rerun-setup", ());
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running claude-usage-widget");
}
