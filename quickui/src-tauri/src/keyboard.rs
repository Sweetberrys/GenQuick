//! 文本捕获模块 - 序列号 + 标志位方案
//! 
//! 核心设计:
//! 1. 使用 GetClipboardSequenceNumber 检测剪贴板变化
//! 2. 使用原子标志位区分「程序模拟复制」和「用户主动复制」
//! 3. rdev 监听鼠标抬起 + enigo 模拟 Ctrl+C
//! 4. 剪贴板监听自动存入 JSON（忽略模拟复制）

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use crate::config::{save_text_cache, read_text_cache};

use enigo::{Enigo, Key, Keyboard, Direction, Settings};

// ============ 全局状态 ============

lazy_static::lazy_static! {
    static ref CAPTURE_ENABLED: AtomicBool = AtomicBool::new(false);
    static ref IS_SIMULATING: AtomicBool = AtomicBool::new(false);  // 标志位：是否正在模拟复制
    static ref LAST_CLIPBOARD: Mutex<String> = Mutex::new(String::new());
    static ref CLIPBOARD_GETTER: Mutex<Option<Box<dyn Fn() -> Result<String, String> + Send + Sync>>> = Mutex::new(None);
    static ref CLIPBOARD_SETTER: Mutex<Option<Box<dyn Fn(&str) -> Result<(), String> + Send + Sync>>> = Mutex::new(None);
}

// ============ Windows 剪贴板序列号 API ============

#[cfg(windows)]
mod clipboard_seq {
    use windows::Win32::System::DataExchange::GetClipboardSequenceNumber;
    
    /// 获取当前剪贴板序列号
    pub fn get_sequence_number() -> u32 {
        unsafe { GetClipboardSequenceNumber() }
    }
}

#[cfg(not(windows))]
mod clipboard_seq {
    use std::sync::atomic::{AtomicU32, Ordering};
    static FAKE_SEQ: AtomicU32 = AtomicU32::new(0);
    
    pub fn get_sequence_number() -> u32 {
        FAKE_SEQ.load(Ordering::Relaxed)
    }
}

// ============ rdev 鼠标监听 ============

/// 启动 rdev 鼠标监听
pub fn start_mouse_listener() -> Result<(), String> {
    std::thread::spawn(|| {
        crate::log!("✅ rdev 鼠标监听已启动");
        
        if let Err(e) = rdev::listen(|event| {
            if let rdev::EventType::ButtonRelease(rdev::Button::Left) = event.event_type {
                if CAPTURE_ENABLED.load(Ordering::Relaxed) {
                    std::thread::spawn(|| {
                        std::thread::sleep(Duration::from_millis(100));
                        capture_selection_on_mouse_up();
                    });
                }
            }
        }) {
            crate::log!("✗ rdev 监听错误: {:?}", e);
        }
    });
    
    Ok(())
}

/// 鼠标抬起时捕获选中文本
fn capture_selection_on_mouse_up() {
    // 设置模拟标志
    IS_SIMULATING.store(true, Ordering::SeqCst);
    
    // 记录当前序列号
    let old_seq = clipboard_seq::get_sequence_number();
    
    // 模拟 Ctrl+C
    if simulate_ctrl_c_enigo().is_err() {
        IS_SIMULATING.store(false, Ordering::SeqCst);
        return;
    }
    
    // 等待序列号变化
    let result = wait_for_sequence_change(old_seq, 1500, 30);
    
    if result {
        // 读取剪贴板内容
        let content = {
            let getter_guard = match CLIPBOARD_GETTER.lock() {
                Ok(g) => g,
                Err(_) => {
                    IS_SIMULATING.store(false, Ordering::SeqCst);
                    return;
                }
            };
            if let Some(ref getter) = *getter_guard {
                getter().unwrap_or_default()
            } else {
                IS_SIMULATING.store(false, Ordering::SeqCst);
                return;
            }
        };
        
        let content = content.trim().to_string();
        if !content.is_empty() {
            let _ = save_text_cache(&content, "mouse_selection");
            let preview: String = content.chars().take(30).collect();
            crate::log!("🖱️ 鼠标选中: \"{}{}\" ({} 字符)", 
                preview, 
                if content.chars().count() > 30 { "..." } else { "" },
                content.len()
            );
        }
    }
    
    // 清除模拟标志
    IS_SIMULATING.store(false, Ordering::SeqCst);
}

/// 等待剪贴板序列号变化
fn wait_for_sequence_change(old_seq: u32, max_wait_ms: u64, poll_interval_ms: u64) -> bool {
    let start = Instant::now();
    let max_wait = Duration::from_millis(max_wait_ms);
    let poll_interval = Duration::from_millis(poll_interval_ms);
    
    loop {
        if start.elapsed() > max_wait {
            return false;
        }
        
        let current_seq = clipboard_seq::get_sequence_number();
        if current_seq != old_seq {
            return true;
        }
        
        std::thread::sleep(poll_interval);
    }
}

// ============ 剪贴板监听（Windows） ============

#[cfg(windows)]
use windows::Win32::{
    Foundation::{LPARAM, LRESULT, WPARAM, HWND, HINSTANCE},
    UI::{
        Input::KeyboardAndMouse::{
            GetAsyncKeyState, VIRTUAL_KEY,
            VK_CONTROL, VK_MENU, VK_SHIFT, VK_LWIN, VK_RWIN,
        },
        WindowsAndMessaging::{
            CreateWindowExW, DefWindowProcW, RegisterClassW, DestroyWindow,
            GetMessageW, TranslateMessage, DispatchMessageW, PostQuitMessage,
            WM_CLIPBOARDUPDATE, WM_DESTROY, WNDCLASSW, MSG, 
            WINDOW_EX_STYLE, WINDOW_STYLE, HMENU,
        },
    },
    System::{
        DataExchange::{AddClipboardFormatListener, RemoveClipboardFormatListener},
        LibraryLoader::GetModuleHandleW,
    },
};

#[cfg(windows)]
static mut CLIPBOARD_MONITOR_GETTER: Option<Box<dyn Fn() -> Result<String, String> + Send>> = None;

#[cfg(windows)]
pub fn start_clipboard_monitor<F>(get_clipboard: F) -> Result<(), String>
where
    F: Fn() -> Result<String, String> + Send + 'static,
{
    std::thread::spawn(move || {
        unsafe {
            let class_name = windows::core::w!("ClipboardMonitorSeq");
            
            let h_instance: HINSTANCE = GetModuleHandleW(None)
                .map(|h| HINSTANCE(h.0))
                .unwrap_or(HINSTANCE(std::ptr::null_mut()));
            
            let wc = WNDCLASSW {
                lpfnWndProc: Some(clipboard_window_proc),
                lpszClassName: windows::core::PCWSTR(class_name.as_ptr()),
                hInstance: h_instance,
                ..Default::default()
            };
            
            RegisterClassW(&wc);
            
            let hwnd = match CreateWindowExW(
                WINDOW_EX_STYLE(0),
                class_name,
                windows::core::w!(""),
                WINDOW_STYLE(0),
                0, 0, 0, 0,
                HWND(std::ptr::null_mut()),
                HMENU(std::ptr::null_mut()),
                h_instance,
                None,
            ) {
                Ok(h) => h,
                Err(e) => {
                    crate::log!("✗ 创建剪贴板监听窗口失败: {:?}", e);
                    return;
                }
            };
            
            if AddClipboardFormatListener(hwnd).is_err() {
                crate::log!("✗ 注册剪贴板监听失败");
                return;
            }
            
            CLIPBOARD_MONITOR_GETTER = Some(Box::new(get_clipboard));
            crate::log!("✅ 剪贴板监听已启动（序列号方案）");
            
            let mut msg = MSG::default();
            while GetMessageW(&mut msg, HWND(std::ptr::null_mut()), 0, 0).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
            
            let _ = RemoveClipboardFormatListener(hwnd);
            let _ = DestroyWindow(hwnd);
        }
    });
    
    Ok(())
}

#[cfg(windows)]
unsafe extern "system" fn clipboard_window_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_CLIPBOARDUPDATE => {
            // 检查是否是程序模拟的复制，如果是则忽略
            if IS_SIMULATING.load(Ordering::SeqCst) {
                return LRESULT(0);
            }
            
            if let Some(getter) = &*(&raw const CLIPBOARD_MONITOR_GETTER) {
                std::thread::sleep(Duration::from_millis(30));
                
                if let Ok(text) = getter() {
                    let text = text.trim().to_string();
                    
                    if !text.is_empty() {
                        let is_new = LAST_CLIPBOARD.lock()
                            .map(|last| *last != text)
                            .unwrap_or(true);
                        
                        if is_new {
                            if let Ok(mut last) = LAST_CLIPBOARD.lock() {
                                *last = text.clone();
                            }
                            
                            if let Err(e) = save_text_cache(&text, "clipboard") {
                                crate::log!("✗ 保存缓存失败: {}", e);
                            } else {
                                let preview: String = text.chars().take(50).collect();
                                let suffix = if text.chars().count() > 50 { "..." } else { "" };
                                crate::log!("📋 剪贴板缓存: \"{}{suffix}\" ({} 字符)", preview, text.len());
                            }
                        }
                    }
                }
            }
            LRESULT(0)
        }
        WM_DESTROY => {
            PostQuitMessage(0);
            LRESULT(0)
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

#[cfg(not(windows))]
pub fn start_clipboard_monitor<F>(_: F) -> Result<(), String>
where F: Fn() -> Result<String, String> + Send + 'static,
{
    Err("剪贴板监听仅支持 Windows".to_string())
}

// ============ 缓存操作 ============

pub fn get_cached_text() -> Option<String> {
    read_text_cache().map(|c| c.text)
}

pub fn clear_cached_text() {
    let _ = crate::config::clear_text_cache();
    if let Ok(mut last) = LAST_CLIPBOARD.lock() {
        *last = String::new();
    }
}


// ============ 辅助函数 ============

pub struct GetTextResult {
    pub text: String,
    pub elapsed_ms: u128,
    pub method: String,
}

#[cfg(windows)]
fn is_key_pressed(vk: VIRTUAL_KEY) -> bool {
    unsafe { GetAsyncKeyState(vk.0 as i32) & 0x8000u16 as i16 != 0 }
}

#[cfg(windows)]
fn is_any_modifier_pressed() -> bool {
    is_key_pressed(VK_CONTROL) || is_key_pressed(VK_MENU) || 
    is_key_pressed(VK_SHIFT) || is_key_pressed(VK_LWIN) || is_key_pressed(VK_RWIN)
}

#[cfg(not(windows))]
fn is_any_modifier_pressed() -> bool { false }

pub fn wait_for_shortcut_release() {
    crate::log!("    → 等待修饰键释放...");
    let start = Instant::now();
    while is_any_modifier_pressed() && start.elapsed() < Duration::from_millis(1500) {
        std::thread::sleep(Duration::from_millis(10));
    }
    crate::log!("    → 修饰键已释放");
    std::thread::sleep(Duration::from_millis(200));
}

fn create_enigo() -> Result<Enigo, String> {
    Enigo::new(&Settings::default()).map_err(|e| format!("创建 Enigo 失败: {:?}", e))
}

fn release_all_modifiers(enigo: &mut Enigo) {
    let _ = enigo.key(Key::Alt, Direction::Release);
    let _ = enigo.key(Key::Control, Direction::Release);
    let _ = enigo.key(Key::Shift, Direction::Release);
    let _ = enigo.key(Key::Meta, Direction::Release);
}

// ============ Ctrl+C/V 模拟 ============

fn simulate_ctrl_c_enigo() -> Result<(), String> {
    let mut enigo = create_enigo()?;
    release_all_modifiers(&mut enigo);
    std::thread::sleep(Duration::from_millis(80));
    
    enigo.key(Key::Control, Direction::Press).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.key(Key::Unicode('c'), Direction::Press).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.key(Key::Unicode('c'), Direction::Release).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.key(Key::Control, Direction::Release).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(80));
    
    Ok(())
}

fn simulate_ctrl_v_enigo() -> Result<(), String> {
    let mut enigo = create_enigo()?;
    release_all_modifiers(&mut enigo);
    std::thread::sleep(Duration::from_millis(50));
    enigo.key(Key::Control, Direction::Press).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.key(Key::Unicode('v'), Direction::Press).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.key(Key::Unicode('v'), Direction::Release).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(50));
    enigo.key(Key::Control, Direction::Release).map_err(|e| format!("{:?}", e))?;
    Ok(())
}

pub fn smart_ctrl_v() -> Result<(), String> {
    wait_for_shortcut_release();
    simulate_ctrl_v_enigo()
}

// ============ 方向键模拟 ============

pub fn simulate_left_arrow() -> Result<(), String> {
    let mut enigo = create_enigo()?;
    release_all_modifiers(&mut enigo);
    std::thread::sleep(Duration::from_millis(30));
    enigo.key(Key::LeftArrow, Direction::Press).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(30));
    enigo.key(Key::LeftArrow, Direction::Release).map_err(|e| format!("{:?}", e))?;
    Ok(())
}

pub fn simulate_right_arrow() -> Result<(), String> {
    let mut enigo = create_enigo()?;
    release_all_modifiers(&mut enigo);
    std::thread::sleep(Duration::from_millis(30));
    enigo.key(Key::RightArrow, Direction::Press).map_err(|e| format!("{:?}", e))?;
    std::thread::sleep(Duration::from_millis(30));
    enigo.key(Key::RightArrow, Direction::Release).map_err(|e| format!("{:?}", e))?;
    Ok(())
}

// ============ 获取选中文本（快捷键触发时调用） ============

/// 实时获取选中文本（使用序列号方案）
pub fn get_selected_text<F, W>(get_clipboard: F, _set_clipboard: W) -> Result<GetTextResult, String>
where F: Fn() -> Result<String, String>, W: Fn(&str) -> Result<(), String>,
{
    let start = Instant::now();
    
    crate::log!("    → 实时获取选中文本");
    
    // 设置模拟标志
    IS_SIMULATING.store(true, Ordering::SeqCst);
    
    // 1. 记录当前序列号
    let old_seq = clipboard_seq::get_sequence_number();
    crate::log!("    → 当前序列号: {}", old_seq);
    
    // 2. 模拟 Ctrl+C
    crate::log!("    → [enigo] 模拟 Ctrl+C");
    if let Err(e) = simulate_ctrl_c_enigo() {
        IS_SIMULATING.store(false, Ordering::SeqCst);
        return Err(e);
    }
    
    // 3. 等待序列号变化
    crate::log!("    → 等待序列号变化（最大 2500ms）");
    let changed = wait_for_sequence_change(old_seq, 2500, 50);
    
    if changed {
        // 读取剪贴板内容
        let content = get_clipboard().unwrap_or_default().trim().to_string();
        
        // 清除模拟标志
        IS_SIMULATING.store(false, Ordering::SeqCst);
        
        if !content.is_empty() {
            let _ = save_text_cache(&content, "selection");
            crate::log!("    → ✓ 成功获取 {} 字符", content.len());
            
            return Ok(GetTextResult {
                text: content,
                elapsed_ms: start.elapsed().as_millis(),
                method: "realtime".to_string(),
            });
        }
    }
    
    // 清除模拟标志
    IS_SIMULATING.store(false, Ordering::SeqCst);
    
    // 实时获取失败，尝试从缓存读取
    crate::log!("    → 实时获取失败，尝试读取缓存");
    if let Some(cached) = get_cached_text() {
        crate::log!("    → ✓ 使用缓存文本");
        Ok(GetTextResult {
            text: cached,
            elapsed_ms: start.elapsed().as_millis(),
            method: "cache_fallback".to_string(),
        })
    } else {
        Err("未选中任何文本，且缓存为空".to_string())
    }
}

// ============ 捕获模式控制 ============

pub fn start_capture_mode<F, W>(get_clipboard: F, set_clipboard: W) -> Result<(), String>
where
    F: Fn() -> Result<String, String> + Send + Sync + 'static,
    W: Fn(&str) -> Result<(), String> + Send + Sync + 'static,
{
    if let Ok(mut getter) = CLIPBOARD_GETTER.lock() {
        *getter = Some(Box::new(get_clipboard));
    }
    if let Ok(mut setter) = CLIPBOARD_SETTER.lock() {
        *setter = Some(Box::new(set_clipboard));
    }
    
    CAPTURE_ENABLED.store(true, Ordering::Relaxed);
    crate::log!("✅ 捕获模式已启动");
    Ok(())
}

pub fn stop_capture_mode() {
    CAPTURE_ENABLED.store(false, Ordering::Relaxed);
    if let Ok(mut getter) = CLIPBOARD_GETTER.lock() {
        *getter = None;
    }
    if let Ok(mut setter) = CLIPBOARD_SETTER.lock() {
        *setter = None;
    }
    crate::log!("✅ 捕获模式已停止");
}

pub fn set_capture_enabled(enabled: bool) {
    CAPTURE_ENABLED.store(enabled, Ordering::Relaxed);
}

pub fn is_capture_enabled() -> bool {
    CAPTURE_ENABLED.load(Ordering::Relaxed)
}

pub fn apply_cached_text<W>(set_clipboard: W) -> Result<String, String>
where W: Fn(&str) -> Result<(), String>,
{
    crate::log!("\n[快捷键] Alt+1");
    
    let text = get_cached_text()
        .ok_or("缓存为空，请先用 Ctrl+C 复制文本".to_string())?;
    
    let preview: String = text.chars().take(60).collect();
    let suffix = if text.chars().count() > 60 { "..." } else { "" };
    
    crate::log!("  📝 内容: \"{}{suffix}\" ({} 字符)", preview, text.len());
    
    set_clipboard(&text)?;
    crate::log!("  ✅ 已放入剪贴板\n");
    
    Ok(text)
}
