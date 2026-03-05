//! GenQuick - AI 智能助手
//! 
//! 主入口模块，负责应用初始化和核心逻辑

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use std::sync::atomic::Ordering;
use std::sync::Mutex as StdMutex;
use std::fs::File;
use std::io::Write;

// Windows DWM API 不再使用，圆角完全由 CSS 实现

// 模块声明
mod config;
mod settings;
mod keyboard;
mod ai;
mod tray;
mod commands;
mod clipboard;

use config::get_data_dir;
use settings::read_settings;
use tray::{setup_tray, MENU_VISIBLE};
use commands::parse_key_code;

// ============ 日志模块 ============

lazy_static::lazy_static! {
    static ref LOG_FILE: StdMutex<Option<File>> = StdMutex::new(None);
}

/// 初始化日志文件（清空并重新创建）
fn init_logger() {
    let log_path = get_data_dir().join("app.log");
    
    // 创建/清空日志文件
    if let Ok(file) = File::create(&log_path) {
        if let Ok(mut log) = LOG_FILE.lock() {
            *log = Some(file);
        }
        log_message(&format!("=== GenQuick 启动 {} ===", chrono::Local::now().format("%Y-%m-%d %H:%M:%S")));
        log_message(&format!("日志文件: {:?}", log_path));
    }
}

/// 写入日志
pub fn log_message(msg: &str) {
    let timestamp = chrono::Local::now().format("%H:%M:%S%.3f");
    let line = format!("[{}] {}\n", timestamp, msg);
    
    // 写入文件
    if let Ok(mut log) = LOG_FILE.lock() {
        if let Some(file) = log.as_mut() {
            let _ = file.write_all(line.as_bytes());
            let _ = file.flush();
        }
    }
    
    // 同时输出到控制台（调试时有用）
    print!("{}", line);
}

/// 日志宏，替代 println!
#[macro_export]
macro_rules! log {
    ($($arg:tt)*) => {
        $crate::log_message(&format!($($arg)*))
    };
}

// ============ 全局状态 ============

lazy_static::lazy_static! {
    pub static ref CURRENT_SHORTCUT: StdMutex<Option<Shortcut>> = StdMutex::new(None);
    pub static ref SELECTED_TEXT: StdMutex<String> = StdMutex::new(String::new());
}

const MENU_WIDTH: i32 = 372;  // 内容 340 + padding 32 (16*2)
const MENU_HEIGHT: i32 = 532; // 内容 500 + padding 32 (16*2)
const SAFE_MARGIN: i32 = 50; // 安全边距（窗口距离屏幕四边的最小距离）

// ============ 应用入口 ============

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    init_logger();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        handle_shortcut(app, shortcut);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::hide_window,
            commands::show_window,
            commands::handle_shortcut_command,
            commands::ai_request,
            commands::ai_request_sync,
            commands::ai_cancel,
            commands::get_stored_text,
            commands::open_settings,
            commands::get_smart_window_position,
            commands::center_window,
            commands::set_window_rounded,
            commands::get_system_theme,
            commands::replace_text,
            commands::insert_text,
            commands::insert_text_before,
            commands::copy_image_only,
            commands::replace_with_image,
            commands::insert_image_before,
            commands::insert_image_after,
            commands::get_api_configs,
            commands::save_api_configs,
            commands::get_prompts_config,
            commands::save_prompts_config,
            commands::get_data_path,
            commands::cmd_get_settings,
            commands::cmd_save_settings,
            commands::cmd_update_shortcut,
            // 捕获模式命令
            commands::start_capture_mode,
            commands::stop_capture_mode,
            commands::set_capture_enabled,
            commands::is_capture_enabled,
            commands::get_cached_text,
            commands::clear_cached_text,
            commands::apply_cached_text
        ])
        .setup(|app| {
            // 读取设置并注册快捷键
            let settings = read_settings();
            let shortcut = parse_shortcut(&settings.shortcut);
            
            app.global_shortcut().register(shortcut.clone())?;
            
            if let Ok(mut current) = CURRENT_SHORTCUT.lock() {
                *current = Some(shortcut);
            }
            log!("全局快捷键 {} 已注册", settings.shortcut);
            
            // 启动剪贴板监听（自动存入 JSON）
            {
                use tauri_plugin_clipboard_manager::ClipboardExt;
                let app_handle = app.handle().clone();
                let _ = keyboard::start_clipboard_monitor(move || {
                    app_handle.clipboard().read_text().map_err(|e| e.to_string())
                });
            }
            
            // 启动 rdev 鼠标监听
            let _ = keyboard::start_mouse_listener();
            
            // 设置主窗口圆角
            if let Some(window) = app.get_webview_window("main") {
                set_window_rounded_corners(&window);
                log!("主窗口圆角已设置");
                
                // 监听窗口事件用于调试
                let _window_clone = window.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::Focused(focused) => {
                            log!("[窗口事件] 焦点变化: {}", focused);
                        }
                        tauri::WindowEvent::Moved(_pos) => {
                            // log!("[窗口事件] 窗口移动: {:?}", pos);
                        }
                        tauri::WindowEvent::CloseRequested { .. } => {
                            log!("[窗口事件] 请求关闭窗口");
                        }
                        tauri::WindowEvent::Destroyed => {
                            log!("[窗口事件] 窗口被销毁");
                        }
                        _ => {}
                    }
                });
            }
            
            // 设置系统托盘
            setup_tray(app.handle())?;
            log!("系统托盘已创建");
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ============ 快捷键处理 ============

/// 解析快捷键字符串为 Shortcut 对象
fn parse_shortcut(shortcut_str: &str) -> Shortcut {
    let parts: Vec<&str> = shortcut_str.split('+').collect();
    
    let modifier = match parts.get(0).unwrap_or(&"Alt") {
        &"Ctrl" => Modifiers::CONTROL,
        &"Shift" => Modifiers::SHIFT,
        &"Alt" => Modifiers::ALT,
        _ => Modifiers::ALT,
    };
    
    let key_char = parts.get(1).and_then(|s| s.chars().next()).unwrap_or('1');
    let code = parse_key_code(key_char).unwrap_or(Code::Digit1);
    
    Shortcut::new(Some(modifier), code)
}

/// 处理快捷键事件
/// 
/// 完整流程：
/// 1. 记录鼠标位置（用于窗口定位）
/// 2. 等待修饰键释放（Alt 键）
/// 3. 清空剪贴板
/// 4. 发送 Ctrl+C 复制选中文本（多次尝试）
/// 5. 读取选中文本
/// 6. 存储文本并显示窗口
pub fn handle_shortcut(app: &AppHandle, _shortcut: &Shortcut) {
    let is_visible = MENU_VISIBLE.load(Ordering::SeqCst);
    
    // 如果窗口已显示，则隐藏
    if is_visible {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
            MENU_VISIBLE.store(false, Ordering::SeqCst);
        }
        return;
    }
    
    log!("=== 快捷键触发 ===");
    
    // 步骤 1: 立即记录鼠标位置（在任何操作之前）
    let (cursor_x, cursor_y) = get_cursor_position();
    log!("[步骤1] 鼠标位置: ({}, {})", cursor_x, cursor_y);
    
    // 步骤 2-5: 使用智能备份恢复方案获取选中文本
    // 优势：
    // - 自动备份和恢复用户剪贴板，不影响用户正常使用
    // - 优先使用 Windows SendInput API（更可靠）
    // - 失败时自动降级到 enigo
    // - 每 30ms 轮询剪贴板变化，快速响应
    log!("[步骤2-5] 获取选中文本（智能备份恢复）...");
    
    // 等待修饰键释放
    keyboard::wait_for_shortcut_release();
    
    // 获取选中文本（会自动备份和恢复剪贴板）
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let text = match keyboard::get_selected_text(
        || app.clipboard().read_text().map_err(|e| e.to_string()),
        |text| app.clipboard().write_text(text.to_string()).map_err(|e| e.to_string())
    ) {
        Ok(result) => {
            log!("[步骤2-5] ✓ 成功获取 {} 字符，耗时: {}ms，方法: {}", 
                result.text.len(), result.elapsed_ms, result.method);
            result.text
        }
        Err(e) => {
            log!("[步骤2-5] ✗ 获取失败: {}", e);
            String::new()
        }
    };
    
    // 步骤 6: 存储文本并发送事件
    log!("[步骤6] 存储文本并通知前端");
    if let Ok(mut stored) = SELECTED_TEXT.lock() {
        *stored = text.clone();
    }
    let _ = app.emit("selected-text", text);
    
    // 步骤 7: 显示窗口
    if let Some(window) = app.get_webview_window("main") {
        let pos = adjust_window_position(app, cursor_x, cursor_y);
        let _ = window.set_position(pos);
        let _ = window.show();
        let _ = window.set_focus();
        MENU_VISIBLE.store(true, Ordering::SeqCst);
        log!("[步骤7] ✓ 窗口已显示");
    }
    
    log!("=== 快捷键处理完成 ===");
}

// ============ 窗口辅助函数 ============

/// 设置窗口透明（Windows 10/11 通用）
/// 
/// 不使用 window-vibrancy，避免模糊效果
/// Tauri 2.x 的 transparent: true 已经处理了大部分透明需求
#[cfg(windows)]
fn set_window_rounded_corners(window: &tauri::WebviewWindow) {
    use raw_window_handle::HasWindowHandle;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND,
    };
    
    // 仅设置 Windows 11 原生圆角（Win10 会静默失败，由 CSS 兜底）
    if let Ok(handle) = window.window_handle() {
        if let raw_window_handle::RawWindowHandle::Win32(win32_handle) = handle.as_raw() {
            let hwnd = HWND(win32_handle.hwnd.get() as *mut _);
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
    log!("✓ 窗口圆角设置完成");
}

#[cfg(not(windows))]
fn set_window_rounded_corners(_window: &tauri::WebviewWindow) {}

/// 获取鼠标位置
fn get_cursor_position() -> (i32, i32) {
    #[cfg(windows)]
    {
        use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
        use windows::Win32::Foundation::POINT;
        
        unsafe {
            let mut point = POINT { x: 0, y: 0 };
            if GetCursorPos(&mut point).is_ok() {
                return (point.x, point.y);
            }
        }
    }
    (0, 0)
}

/// 获取当前前台窗口信息（调试用）
#[cfg(windows)]
#[allow(dead_code)]
fn get_foreground_window_info() -> String {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetClassNameW};
    
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return "无".to_string();
        }
        
        let mut title_buf = [0u16; 256];
        let title_len = GetWindowTextW(hwnd, &mut title_buf);
        let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);
        
        let mut class_buf = [0u16; 256];
        let class_len = GetClassNameW(hwnd, &mut class_buf);
        let class = String::from_utf16_lossy(&class_buf[..class_len as usize]);
        
        format!("\"{}\" ({})", title, class)
    }
}

/// 调整窗口位置（QuickMenu 跟随鼠标位置）
fn adjust_window_position(app: &AppHandle, cursor_x: i32, cursor_y: i32) -> PhysicalPosition<i32> {
    // QuickMenu 跟随鼠标位置，使用边界检测确保窗口在屏幕内
    adjust_window_position_with_size(app, cursor_x, cursor_y, MENU_WIDTH, MENU_HEIGHT)
}

/// 获取窗口在鼠标所在显示器中央的位置
fn get_centered_position(
    app: &AppHandle,
    cursor_x: i32,
    cursor_y: i32,
    window_width: i32,
    window_height: i32
) -> PhysicalPosition<i32> {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(monitors) = window.available_monitors() {
            // 找到鼠标所在的显示器
            for monitor in monitors {
                let m_pos = monitor.position();
                let m_size = monitor.size();
                
                let screen_left = m_pos.x;
                let screen_top = m_pos.y;
                let screen_right = m_pos.x + m_size.width as i32;
                let screen_bottom = m_pos.y + m_size.height as i32;
                
                // 检查鼠标是否在此显示器上
                if cursor_x >= screen_left 
                    && cursor_x < screen_right
                    && cursor_y >= screen_top 
                    && cursor_y < screen_bottom 
                {
                    log!("   当前显示器: {}x{} @ ({}, {})", 
                        m_size.width, m_size.height, m_pos.x, m_pos.y);
                    
                    // 计算显示器中央位置
                    let center_x = screen_left + (m_size.width as i32 - window_width) / 2;
                    let center_y = screen_top + (m_size.height as i32 - window_height) / 2;
                    
                    log!("   窗口居中位置: ({}, {})", center_x, center_y);
                    return PhysicalPosition::new(center_x, center_y);
                }
            }
        }
    }
    
    // 如果找不到显示器，返回原始位置
    PhysicalPosition::new(cursor_x, cursor_y)
}

/// 通用窗口位置调整函数（支持自定义窗口尺寸和多显示器）
/// 
/// # 参数
/// - `app`: Tauri 应用句柄
/// - `cursor_x`: 鼠标 X 坐标（物理像素）
/// - `cursor_y`: 鼠标 Y 坐标（物理像素）
/// - `window_width`: 窗口宽度
/// - `window_height`: 窗口高度
/// 
/// # 返回
/// 调整后的窗口位置，确保窗口完全显示在屏幕内且距离边缘至少 SAFE_MARGIN 像素
fn adjust_window_position_with_size(
    app: &AppHandle, 
    cursor_x: i32, 
    cursor_y: i32,
    window_width: i32,
    window_height: i32
) -> PhysicalPosition<i32> {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(monitors) = window.available_monitors() {
            // 找到鼠标所在的显示器
            for monitor in monitors {
                let m_pos = monitor.position();
                let m_size = monitor.size();
                
                // 显示器边界（物理像素坐标）
                let screen_left = m_pos.x;
                let screen_top = m_pos.y;
                let screen_right = m_pos.x + m_size.width as i32;
                let screen_bottom = m_pos.y + m_size.height as i32;
                
                // 检查鼠标是否在此显示器上
                if cursor_x >= screen_left 
                    && cursor_x < screen_right
                    && cursor_y >= screen_top 
                    && cursor_y < screen_bottom 
                {
                    log!("   当前显示器: {}x{} @ ({}, {})", 
                        m_size.width, m_size.height, m_pos.x, m_pos.y);
                    log!("   窗口尺寸: {}x{}, 安全边距: {}px", 
                        window_width, window_height, SAFE_MARGIN);
                    
                    // 计算显示器的安全区域（考虑边距）
                    let safe_left = screen_left + SAFE_MARGIN;
                    let safe_top = screen_top + SAFE_MARGIN;
                    let safe_right = screen_right - SAFE_MARGIN;
                    let safe_bottom = screen_bottom - SAFE_MARGIN;
                    
                    // 计算安全区域的可用尺寸
                    let available_width = safe_right - safe_left;
                    let available_height = safe_bottom - safe_top;
                    
                    // 检查窗口是否能放入安全区域
                    if window_width > available_width || window_height > available_height {
                        log!("   ⚠ 窗口尺寸超过安全区域，将尽可能居中显示");
                        // 窗口太大，居中显示在屏幕上
                        let center_x = screen_left + (m_size.width as i32 - window_width) / 2;
                        let center_y = screen_top + (m_size.height as i32 - window_height) / 2;
                        log!("   最终位置（居中）: ({}, {})", center_x, center_y);
                        return PhysicalPosition::new(center_x, center_y);
                    }
                    
                    // 计算理想位置（鼠标位置）
                    let mut new_x = cursor_x;
                    let mut new_y = cursor_y;
                    
                    // 计算窗口右下角位置
                    let popup_right = new_x + window_width;
                    let popup_bottom = new_y + window_height;
                    
                    // 右边界检测：如果窗口右边超出安全区域，向左偏移
                    if popup_right > safe_right {
                        new_x = safe_right - window_width;
                        log!("   右边界调整: x {} -> {}", cursor_x, new_x);
                    }
                    
                    // 下边界检测：如果窗口下边超出安全区域，向上偏移
                    if popup_bottom > safe_bottom {
                        new_y = safe_bottom - window_height;
                        log!("   下边界调整: y {} -> {}", cursor_y, new_y);
                    }
                    
                    // 左边界检测：如果窗口左边超出安全区域，向右偏移
                    // （这可能发生在右边界调整后）
                    if new_x < safe_left {
                        new_x = safe_left;
                        log!("   左边界调整: x = {}", new_x);
                    }
                    
                    // 上边界检测：如果窗口上边超出安全区域，向下偏移
                    // （这可能发生在下边界调整后）
                    if new_y < safe_top {
                        new_y = safe_top;
                        log!("   上边界调整: y = {}", new_y);
                    }
                    
                    log!("   最终位置: ({}, {})", new_x, new_y);
                    return PhysicalPosition::new(new_x, new_y);
                }
            }
            
            // 如果鼠标不在任何已知显示器上（可能是多显示器配置问题）
            // 尝试使用第一个显示器
            log!("   ⚠ 鼠标位置 ({}, {}) 不在任何已知显示器上", cursor_x, cursor_y);
        }
    }
    
    // 如果找不到显示器，返回原始位置
    log!("   使用原始位置: ({}, {})", cursor_x, cursor_y);
    PhysicalPosition::new(cursor_x, cursor_y)
}

/// 为指定窗口计算智能位置（供前端调用）
pub fn calculate_smart_position(
    app: &AppHandle,
    window_width: i32,
    window_height: i32
) -> (i32, i32) {
    let (cursor_x, cursor_y) = get_cursor_position();
    let pos = adjust_window_position_with_size(app, cursor_x, cursor_y, window_width, window_height);
    (pos.x, pos.y)
}

/// 获取鼠标位置（公开版本，供 commands 模块调用）
pub fn get_cursor_position_pub() -> (i32, i32) {
    get_cursor_position()
}

/// 获取窗口在鼠标所在显示器中央的位置（公开版本，供 commands 模块调用）
pub fn get_centered_position_pub(
    app: &AppHandle,
    cursor_x: i32,
    cursor_y: i32,
    window_width: i32,
    window_height: i32
) -> PhysicalPosition<i32> {
    get_centered_position(app, cursor_x, cursor_y, window_width, window_height)
}
