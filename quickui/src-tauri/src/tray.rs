//! 系统托盘模块
//! 
//! 处理系统托盘的创建、菜单和事件

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::AppHandle;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::Manager;

/// 菜单可见状态（需要从外部访问）
pub static MENU_VISIBLE: AtomicBool = AtomicBool::new(false);

/// 设置系统托盘
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let menu = Menu::with_items(app, &[
        &MenuItem::with_id(app, "settings", "⚙️ 设置", true, None::<&str>)?,
        &PredefinedMenuItem::separator(app)?,
        &MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?,
    ])?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("GenQuick - AI 智能助手")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "settings" => {
                    open_settings_window(app);
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            match event {
                TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } => {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        if MENU_VISIBLE.load(Ordering::SeqCst) {
                            let _ = window.hide();
                            MENU_VISIBLE.store(false, Ordering::SeqCst);
                        } else {
                            let _ = window.center();
                            let _ = window.show();
                            let _ = window.set_focus();
                            MENU_VISIBLE.store(true, Ordering::SeqCst);
                        }
                    }
                }
                TrayIconEvent::DoubleClick { button: MouseButton::Left, .. } => {
                    let app = tray.app_handle();
                    open_settings_window(app);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

/// 打开设置窗口
pub fn open_settings_window(app: &AppHandle) {
    // 检查设置窗口是否已存在
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    
    // 创建设置窗口 - 无边框圆角
    if let Ok(settings_window) = tauri::WebviewWindowBuilder::new(
        app,
        "settings",
        tauri::WebviewUrl::App("index.html#/settings".into())
    )
    .title("GenQuick 设置")
    .inner_size(782.0, 632.0)  // 内容 700x600 + padding 32 (16*2)
    .min_inner_size(682.0, 432.0)
    .center()
    .resizable(true)
    .decorations(false)    // 关闭系统标题栏
    .transparent(true)     // 启用透明
    .shadow(false)         // 关闭系统阴影
    .visible(true)
    .disable_drag_drop_handler()  // 禁用 Tauri 的文件拖放处理，以支持 HTML5 拖拽
    .build() {
        // 设置窗口圆角
        set_window_rounded_corners(&settings_window);
    }
}

/// 设置窗口圆角（Windows 11 原生支持，Win10 由 CSS 兜底）
#[cfg(windows)]
fn set_window_rounded_corners(window: &tauri::WebviewWindow) {
    use raw_window_handle::HasWindowHandle;
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND
    };
    
    if let Ok(handle) = window.window_handle() {
        if let raw_window_handle::RawWindowHandle::Win32(win32_handle) = handle.as_raw() {
            let hwnd = windows::Win32::Foundation::HWND(win32_handle.hwnd.get() as *mut _);
            unsafe {
                let preference = DWMWCP_ROUND;
                let _ = DwmSetWindowAttribute(
                    hwnd,
                    DWMWA_WINDOW_CORNER_PREFERENCE,
                    &preference as *const _ as *const _,
                    std::mem::size_of_val(&preference) as u32,
                );
            }
        }
    }
}

#[cfg(not(windows))]
fn set_window_rounded_corners(_window: &tauri::WebviewWindow) {}
