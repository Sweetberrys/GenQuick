//! Tauri 命令模块
//! 
//! 所有暴露给前端的命令都在这里定义

use std::sync::atomic::Ordering;
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use crate::ai;
use crate::tray::{MENU_VISIBLE, open_settings_window};
use crate::keyboard;
use crate::config::{
    ApiConfigStore, PromptConfigStore,
    read_api_config, save_api_config, read_prompt_config, save_prompt_config,
    get_data_dir
};
use crate::settings::{AppSettings, read_settings, save_settings, validate_shortcut};
use crate::{CURRENT_SHORTCUT, SELECTED_TEXT, handle_shortcut};

// ============ 窗口命令 ============

#[tauri::command]
pub fn handle_shortcut_command(app: AppHandle) -> Result<String, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    crate::log!("=== handle_shortcut_command 调用 ===");
    
    // 1. 等待快捷键释放
    keyboard::wait_for_shortcut_release();
    
    // 2. 使用智能备份恢复方式获取选中文本
    let result = keyboard::get_selected_text(
        || app.clipboard().read_text().map_err(|e| e.to_string()),
        |text| app.clipboard().write_text(text.to_string()).map_err(|e| e.to_string()),
    )?;
    
    crate::log!("获取到文本: {} 字符，耗时: {}ms，方法: {}", 
        result.text.len(), result.elapsed_ms, result.method);
    
    Ok(result.text)
}

#[tauri::command]
pub async fn hide_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        MENU_VISIBLE.store(false, Ordering::SeqCst);
    }
}

#[tauri::command]
pub async fn show_window(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        MENU_VISIBLE.store(true, Ordering::SeqCst);
    }
}

#[tauri::command]
pub async fn open_settings(app: AppHandle) {
    open_settings_window(&app);
}

/// 获取智能窗口位置（基于鼠标位置和窗口尺寸）
#[tauri::command]
pub fn get_smart_window_position(app: AppHandle, width: i32, height: i32) -> (i32, i32) {
    crate::calculate_smart_position(&app, width, height)
}

/// 将窗口居中显示在鼠标所在的显示器上
#[tauri::command]
pub async fn center_window(app: AppHandle, width: i32, height: i32) -> Result<(), String> {
    crate::log!("=== 窗口居中 ===");
    crate::log!("窗口尺寸: {}x{}", width, height);
    
    if let Some(window) = app.get_webview_window("main") {
        // 获取当前鼠标位置
        let (cursor_x, cursor_y) = crate::get_cursor_position_pub();
        crate::log!("鼠标位置: ({}, {})", cursor_x, cursor_y);
        
        // 计算居中位置
        let pos = crate::get_centered_position_pub(&app, cursor_x, cursor_y, width, height);
        crate::log!("居中位置: ({}, {})", pos.x, pos.y);
        
        // 设置窗口位置
        window.set_position(pos).map_err(|e| format!("设置窗口位置失败: {}", e))?;
        
        crate::log!("=== 窗口居中完成 ===");
    }
    
    Ok(())
}

/// 设置窗口圆角
#[tauri::command]
pub fn set_window_rounded(app: AppHandle) {
    #[cfg(windows)]
    {
        use raw_window_handle::HasWindowHandle;
        use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND};
        
        if let Some(window) = app.get_webview_window("main") {
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
    }
}

/// 获取系统主题（dark/light）
#[tauri::command]
pub fn get_system_theme() -> String {
    #[cfg(windows)]
    {
        use windows::Win32::System::Registry::{RegOpenKeyExW, RegQueryValueExW, HKEY_CURRENT_USER, KEY_READ, REG_DWORD, REG_VALUE_TYPE};
        use windows::core::PCWSTR;
        
        unsafe {
            let mut hkey = windows::Win32::System::Registry::HKEY::default();
            let subkey: Vec<u16> = "Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize\0"
                .encode_utf16().collect();
            
            if RegOpenKeyExW(HKEY_CURRENT_USER, PCWSTR(subkey.as_ptr()), 0, KEY_READ, &mut hkey).is_ok() {
                let value_name: Vec<u16> = "AppsUseLightTheme\0".encode_utf16().collect();
                let mut data: u32 = 1;
                let mut data_size: u32 = std::mem::size_of::<u32>() as u32;
                let mut data_type = REG_VALUE_TYPE::default();
                
                if RegQueryValueExW(
                    hkey,
                    PCWSTR(value_name.as_ptr()),
                    None,
                    Some(&mut data_type),
                    Some(&mut data as *mut u32 as *mut u8),
                    Some(&mut data_size),
                ).is_ok() && data_type == REG_DWORD {
                    return if data == 0 { "dark".to_string() } else { "light".to_string() };
                }
            }
        }
    }
    "light".to_string()
}

#[tauri::command]
#[allow(dead_code)]
pub fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "GenQuick",
        "version": "1.0.0",
        "description": "AI 智能助手",
        "shortcut": "Alt+1"
    })
}

#[tauri::command]
pub fn get_stored_text() -> String {
    SELECTED_TEXT.lock().map(|s| s.clone()).unwrap_or_default()
}

// ============ AI 命令 ============

/// 消息结构(从前端接收)
#[derive(serde::Deserialize)]
pub struct ChatMessageInput {
    pub role: String,
    pub content: String,
    pub images: Option<Vec<String>>,
}

#[tauri::command]
pub async fn ai_request(
    app: AppHandle,
    endpoint: String,
    api_key: String,
    model: String,
    api_type: String,
    messages: Vec<ChatMessageInput>,
    request_id: Option<String>,
) -> Result<(), String> {
    crate::log!("=== AI 请求开始 ===");
    crate::log!("API 类型: {}", api_type);
    crate::log!("消息数量: {}", messages.len());
    if let Some(ref id) = request_id {
        crate::log!("请求ID: {}", id);
    }

    // 转换消息格式
    let simple_messages: Vec<ai::SimpleMessage> = messages
        .into_iter()
        .map(|m| ai::SimpleMessage {
            role: m.role,
            content: m.content,
            images: m.images,
        })
        .collect();

    ai::send_ai_request(&app, endpoint, api_key, model, api_type, simple_messages, request_id).await
}

#[tauri::command]
pub async fn ai_cancel() {
    ai::cancel_ai_request();
}

/// 同步 AI 请求（非流式，返回完整响应）
#[tauri::command]
pub async fn ai_request_sync(
    endpoint: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessageInput>,
) -> Result<String, String> {
    crate::log!("=== AI 同步请求开始 ===");
    crate::log!("消息数量: {}", messages.len());

    // 转换消息格式
    let simple_messages: Vec<ai::SimpleMessage> = messages
        .into_iter()
        .map(|m| ai::SimpleMessage {
            role: m.role,
            content: m.content,
            images: m.images,
        })
        .collect();

    ai::send_ai_request_sync(endpoint, api_key, model, simple_messages).await
}

// ============ 文本操作命令 ============

#[tauri::command]
pub async fn replace_text(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    crate::log!("=== 开始替换文本 ===");
    
    // 1. 先隐藏窗口,让焦点回到原来的应用
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        MENU_VISIBLE.store(false, Ordering::SeqCst);
        crate::log!("1. 窗口已隐藏");
    }
    
    // 2. 等待窗口隐藏和焦点切换(增加等待时间,确保焦点完全切换)
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    crate::log!("2. 等待焦点切换完成");
    
    // 3. 将新文本写入剪贴板
    app.clipboard()
        .write_text(text.clone())
        .map_err(|e| format!("写入剪贴板失败: {}", e))?;
    crate::log!("3. 文本已写入剪贴板: {} 字符", text.len());
    
    // 4. 等待剪贴板更新(增加等待时间,确保系统完全同步)
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
    crate::log!("4. 等待剪贴板更新完成");
    
    // 5. 验证剪贴板内容
    match app.clipboard().read_text() {
        Ok(clipboard_content) if clipboard_content == text => {
            crate::log!("5. 剪贴板内容验证成功");
        }
        Ok(clipboard_content) => {
            crate::log!("⚠ 剪贴板内容不匹配,期望 {} 字符,实际 {} 字符", 
                text.len(), clipboard_content.len());
        }
        Err(e) => {
            crate::log!("⚠ 无法验证剪贴板内容: {}", e);
        }
    }
    
    // 6. 使用智能 Ctrl+V (多次尝试)
    for attempt in 1..=3 {
        crate::log!("6. 第 {} 次粘贴尝试", attempt);
        
        let result = tokio::task::spawn_blocking(|| keyboard::smart_ctrl_v()).await;
        
        match result {
            Ok(Ok(())) => {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                crate::log!("=== 替换文本完成 ===");
                return Ok(());
            },
            Ok(Err(e)) => {
                crate::log!("✗ 第 {} 次尝试失败: {}", attempt, e);
            },
            Err(e) => {
                crate::log!("✗ 第 {} 次任务执行失败: {}", attempt, e);
            },
        }
        
        // 失败后等待再试
        if attempt < 3 {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    }
    
    Err("替换失败: 所有粘贴尝试均未成功".to_string())
}

#[tauri::command]
pub async fn insert_text(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    crate::log!("=== 开始后置插入文本 ===");
    
    // 1. 先隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        MENU_VISIBLE.store(false, Ordering::SeqCst);
        crate::log!("1. 窗口已隐藏");
    }
    
    // 2. 等待焦点切换
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    crate::log!("2. 等待焦点切换完成");
    
    // 3. 移动光标到选中文本末尾
    crate::log!("3. 移动光标到选中文本末尾");
    let move_result = tokio::task::spawn_blocking(|| keyboard::simulate_right_arrow()).await;
    
    if let Err(e) = move_result.map_err(|e| e.to_string()).and_then(|r| r) {
        crate::log!("⚠ 移动光标失败: {}", e);
        return Err(format!("移动光标失败: {}", e));
    }
    
    // 4. 写入剪贴板
    app.clipboard()
        .write_text(text.clone())
        .map_err(|e| format!("写入剪贴板失败: {}", e))?;
    crate::log!("4. 文本已写入剪贴板: {} 字符", text.len());
    
    // 5. 等待剪贴板更新
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
    crate::log!("5. 等待剪贴板更新完成");
    
    // 6. 验证剪贴板内容
    match app.clipboard().read_text() {
        Ok(clipboard_content) if clipboard_content == text => {
            crate::log!("6. 剪贴板内容验证成功");
        }
        _ => {
            crate::log!("⚠ 无法验证剪贴板内容");
        }
    }
    
    // 7. 使用智能 Ctrl+V (多次尝试)
    for attempt in 1..=3 {
        crate::log!("7. 第 {} 次粘贴尝试", attempt);
        
        let result = tokio::task::spawn_blocking(|| keyboard::smart_ctrl_v()).await;
        
        match result {
            Ok(Ok(())) => {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                crate::log!("=== 后置插入文本完成 ===");
                return Ok(());
            },
            Ok(Err(e)) => {
                crate::log!("✗ 第 {} 次尝试失败: {}", attempt, e);
            },
            Err(e) => {
                crate::log!("✗ 第 {} 次任务执行失败: {}", attempt, e);
            },
        }
        
        // 失败后等待再试
        if attempt < 3 {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    }
    
    Err("后置插入失败: 所有粘贴尝试均未成功".to_string())
}

#[tauri::command]
pub async fn insert_text_before(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    crate::log!("=== 开始前置插入文本 ===");
    
    // 1. 先隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        MENU_VISIBLE.store(false, Ordering::SeqCst);
        crate::log!("1. 窗口已隐藏");
    }
    
    // 2. 等待焦点切换
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    crate::log!("2. 等待焦点切换完成");
    
    // 3. 移动光标到选中文本开头
    crate::log!("3. 移动光标到选中文本开头");
    let move_result = tokio::task::spawn_blocking(|| keyboard::simulate_left_arrow()).await;
    
    if let Err(e) = move_result.map_err(|e| e.to_string()).and_then(|r| r) {
        crate::log!("⚠ 移动光标失败: {}", e);
        return Err(format!("移动光标失败: {}", e));
    }
    
    // 4. 写入剪贴板
    app.clipboard()
        .write_text(text.clone())
        .map_err(|e| format!("写入剪贴板失败: {}", e))?;
    crate::log!("4. 文本已写入剪贴板: {} 字符", text.len());
    
    // 5. 等待剪贴板更新
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
    crate::log!("5. 等待剪贴板更新完成");
    
    // 6. 验证剪贴板内容
    match app.clipboard().read_text() {
        Ok(clipboard_content) if clipboard_content == text => {
            crate::log!("6. 剪贴板内容验证成功");
        }
        _ => {
            crate::log!("⚠ 无法验证剪贴板内容");
        }
    }
    
    // 7. 使用智能 Ctrl+V (多次尝试)
    for attempt in 1..=3 {
        crate::log!("7. 第 {} 次粘贴尝试", attempt);
        
        let result = tokio::task::spawn_blocking(|| keyboard::smart_ctrl_v()).await;
        
        match result {
            Ok(Ok(())) => {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                crate::log!("=== 前置插入文本完成 ===");
                return Ok(());
            },
            Ok(Err(e)) => {
                crate::log!("✗ 第 {} 次尝试失败: {}", attempt, e);
            },
            Err(e) => {
                crate::log!("✗ 第 {} 次任务执行失败: {}", attempt, e);
            },
        }
        
        // 失败后等待再试
        if attempt < 3 {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    }
    
    Err("前置插入失败: 所有粘贴尝试均未成功".to_string())
}

// ============ 图片粘贴命令（用于图表功能） ============

/// 将图片写入剪贴板（内部函数）
async fn write_image_to_clipboard(png_data: Vec<u8>) -> Result<(), String> {
    crate::log!("=== 收到写入图片请求 ===");
    crate::log!("数据大小: {} 字节", png_data.len());
    
    tokio::task::spawn_blocking(move || {
        crate::clipboard::write_image_to_clipboard(&png_data)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// 复制图片到剪贴板
#[tauri::command]
pub async fn copy_image_only(png_data: Vec<u8>) -> Result<(), String> {
    write_image_to_clipboard(png_data).await
}

/// 替换选中内容（先写入图片到剪贴板，再粘贴）
#[tauri::command]
pub async fn replace_with_image(app: AppHandle, png_data: Vec<u8>) -> Result<(), String> {
    crate::log!("=== 开始替换（图片） ===");
    
    // 1. 写入图片到剪贴板
    write_image_to_clipboard(png_data).await?;
    
    // 2. 隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        MENU_VISIBLE.store(false, Ordering::SeqCst);
        crate::log!("窗口已隐藏");
    }
    
    // 3. 等待焦点切换
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    // 4. 执行粘贴
    for attempt in 1..=3 {
        crate::log!("第 {} 次粘贴尝试", attempt);
        
        let result = tokio::task::spawn_blocking(|| keyboard::smart_ctrl_v()).await;
        
        match result {
            Ok(Ok(())) => {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                crate::log!("=== 替换完成 ===");
                return Ok(());
            },
            Ok(Err(e)) => crate::log!("尝试失败: {}", e),
            Err(e) => crate::log!("任务失败: {}", e),
        }
        
        if attempt < 3 {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    }
    
    Err("替换失败: 所有粘贴尝试均未成功".to_string())
}

/// 前置插入图片
#[tauri::command]
pub async fn insert_image_before(app: AppHandle, png_data: Vec<u8>) -> Result<(), String> {
    crate::log!("=== 开始前置插入（图片） ===");
    
    // 1. 写入图片到剪贴板
    write_image_to_clipboard(png_data).await?;
    
    // 2. 隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        MENU_VISIBLE.store(false, Ordering::SeqCst);
    }
    
    // 3. 等待焦点切换
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    // 4. 移动光标到选中文本开头
    let move_result = tokio::task::spawn_blocking(|| keyboard::simulate_left_arrow()).await;
    if let Err(e) = move_result.map_err(|e| e.to_string()).and_then(|r| r) {
        return Err(format!("移动光标失败: {}", e));
    }
    
    // 5. 执行粘贴
    for attempt in 1..=3 {
        let result = tokio::task::spawn_blocking(|| keyboard::smart_ctrl_v()).await;
        
        match result {
            Ok(Ok(())) => {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                crate::log!("=== 前置插入完成 ===");
                return Ok(());
            },
            _ => {}
        }
        
        if attempt < 3 {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    }
    
    Err("前置插入失败".to_string())
}

/// 后置插入图片
#[tauri::command]
pub async fn insert_image_after(app: AppHandle, png_data: Vec<u8>) -> Result<(), String> {
    crate::log!("=== 开始后置插入（图片） ===");
    
    // 1. 写入图片到剪贴板
    write_image_to_clipboard(png_data).await?;
    
    // 2. 隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        MENU_VISIBLE.store(false, Ordering::SeqCst);
    }
    
    // 3. 等待焦点切换
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    // 4. 移动光标到选中文本末尾
    let move_result = tokio::task::spawn_blocking(|| keyboard::simulate_right_arrow()).await;
    if let Err(e) = move_result.map_err(|e| e.to_string()).and_then(|r| r) {
        return Err(format!("移动光标失败: {}", e));
    }
    
    // 5. 执行粘贴
    for attempt in 1..=3 {
        let result = tokio::task::spawn_blocking(|| keyboard::smart_ctrl_v()).await;
        
        match result {
            Ok(Ok(())) => {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                crate::log!("=== 后置插入完成 ===");
                return Ok(());
            },
            _ => {}
        }
        
        if attempt < 3 {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }
    }
    
    Err("后置插入失败".to_string())
}

// ============ 配置命令 ============

#[tauri::command]
pub fn get_api_configs() -> ApiConfigStore {
    read_api_config()
}

#[tauri::command]
pub fn save_api_configs(configs: ApiConfigStore) -> Result<(), String> {
    save_api_config(&configs)
}

#[tauri::command]
pub fn get_prompts_config() -> PromptConfigStore {
    read_prompt_config()
}

#[tauri::command]
pub fn save_prompts_config(config: PromptConfigStore) -> Result<(), String> {
    save_prompt_config(&config)
}

#[tauri::command]
pub fn get_data_path() -> String {
    get_data_dir().to_string_lossy().to_string()
}

// ============ 设置命令 ============

#[tauri::command]
pub fn cmd_get_settings() -> AppSettings {
    read_settings()
}

#[tauri::command]
pub fn cmd_save_settings(settings: AppSettings) -> Result<(), String> {
    save_settings(&settings)
}

#[tauri::command]
pub async fn cmd_update_shortcut(app: AppHandle, new_shortcut: String) -> Result<(), String> {
    if !validate_shortcut(&new_shortcut) {
        return Err("快捷键格式无效,请使用 Ctrl/Shift/Alt + 字母或数字".to_string());
    }
    
    // 解析新快捷键
    let parts: Vec<&str> = new_shortcut.split('+').collect();
    let modifier = match parts[0] {
        "Ctrl" => Modifiers::CONTROL,
        "Shift" => Modifiers::SHIFT,
        "Alt" => Modifiers::ALT,
        _ => return Err("无效的修饰键".to_string()),
    };
    
    let key_char = parts[1].chars().next().unwrap();
    let code = parse_key_code(key_char).ok_or("无效的按键")?;
    
    let new_shortcut_obj = Shortcut::new(Some(modifier), code);
    
    // 注销旧快捷键并注册新快捷键
    if let Ok(mut current) = CURRENT_SHORTCUT.lock() {
        if let Some(old_shortcut) = current.take() {
            let _ = app.global_shortcut().unregister(old_shortcut);
        }
        
        app.global_shortcut()
            .on_shortcut(new_shortcut_obj.clone(), |app_handle, shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    handle_shortcut(app_handle, &shortcut);
                }
            })
            .map_err(|e| format!("设置快捷键处理器失败: {}", e))?;
            
        app.global_shortcut()
            .register(new_shortcut_obj.clone())
            .map_err(|e| format!("注册快捷键失败: {}", e))?;
        
        *current = Some(new_shortcut_obj);
    }
    
    // 保存设置
    let mut settings = read_settings();
    settings.shortcut = new_shortcut;
    save_settings(&settings)?;
    
    crate::log!("快捷键已更新为: {}", settings.shortcut);
    
    Ok(())
}

// ============ 捕获模式命令 ============

/// 启动鼠标捕获模式
#[tauri::command]
pub fn start_capture_mode(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    crate::log!("=== 启动捕获模式 ===");
    
    let app_clone = app.clone();
    keyboard::start_capture_mode(
        move || app_clone.clipboard().read_text().map_err(|e| e.to_string()),
        move |text| app.clipboard().write_text(text.to_string()).map_err(|e| e.to_string()),
    )
}

/// 停止鼠标捕获模式
#[tauri::command]
pub fn stop_capture_mode() {
    crate::log!("=== 停止捕获模式 ===");
    keyboard::stop_capture_mode();
}

/// 启用/禁用捕获
#[tauri::command]
pub fn set_capture_enabled(enabled: bool) {
    keyboard::set_capture_enabled(enabled);
}

/// 检查捕获是否启用
#[tauri::command]
pub fn is_capture_enabled() -> bool {
    keyboard::is_capture_enabled()
}

/// 获取缓存的文本
#[tauri::command]
pub fn get_cached_text() -> Option<String> {
    keyboard::get_cached_text()
}

/// 清空缓存
#[tauri::command]
pub fn clear_cached_text() {
    keyboard::clear_cached_text();
}

/// 将缓存文本放入剪贴板（Alt+1 触发）
#[tauri::command]
pub fn apply_cached_text(app: AppHandle) -> Result<String, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    keyboard::apply_cached_text(|text| {
        app.clipboard().write_text(text.to_string()).map_err(|e| e.to_string())
    })
}

/// 解析按键字符为 Code
pub fn parse_key_code(c: char) -> Option<Code> {
    match c {
        'A' => Some(Code::KeyA),
        'B' => Some(Code::KeyB),
        'C' => Some(Code::KeyC),
        'D' => Some(Code::KeyD),
        'E' => Some(Code::KeyE),
        'F' => Some(Code::KeyF),
        'G' => Some(Code::KeyG),
        'H' => Some(Code::KeyH),
        'I' => Some(Code::KeyI),
        'J' => Some(Code::KeyJ),
        'K' => Some(Code::KeyK),
        'L' => Some(Code::KeyL),
        'M' => Some(Code::KeyM),
        'N' => Some(Code::KeyN),
        'O' => Some(Code::KeyO),
        'P' => Some(Code::KeyP),
        'Q' => Some(Code::KeyQ),
        'R' => Some(Code::KeyR),
        'S' => Some(Code::KeyS),
        'T' => Some(Code::KeyT),
        'U' => Some(Code::KeyU),
        'V' => Some(Code::KeyV),
        'W' => Some(Code::KeyW),
        'X' => Some(Code::KeyX),
        'Y' => Some(Code::KeyY),
        'Z' => Some(Code::KeyZ),
        '0' => Some(Code::Digit0),
        '1' => Some(Code::Digit1),
        '2' => Some(Code::Digit2),
        '3' => Some(Code::Digit3),
        '4' => Some(Code::Digit4),
        '5' => Some(Code::Digit5),
        '6' => Some(Code::Digit6),
        '7' => Some(Code::Digit7),
        '8' => Some(Code::Digit8),
        '9' => Some(Code::Digit9),
        _ => None,
    }
}
