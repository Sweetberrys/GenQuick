use tauri::Manager;
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::thread;
use std::time::Duration;

// 内部函数：获取选中文本
pub async fn get_selected_text_internal() -> Result<String, String> {
    // 1. 备份当前剪贴板
    let backup = {
        // 这里需要读取剪贴板内容作为备份
        // 简化处理，实际需要更完善的实现
        String::new()
    };

    // 2. 模拟 Ctrl+C
    simulate_copy()?;
    
    // 3. 等待剪贴板更新
    thread::sleep(Duration::from_millis(100));
    
    // 4. 读取剪贴板
    let text = read_clipboard().map_err(|e| e.to_string())?;
    
    // 5. 恢复剪贴板（异步）
    if !backup.is_empty() {
        let _ = write_clipboard(&backup);
    }
    
    Ok(text)
}

#[tauri::command]
pub async fn get_selected_text() -> Result<String, String> {
    get_selected_text_internal().await
}

#[tauri::command]
pub async fn copy_to_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(&text)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn replace_selected_text(text: String) -> Result<(), String> {
    // 1. 写入剪贴板
    write_clipboard(&text)?;
    
    // 2. 模拟 Ctrl+V
    simulate_paste()?;
    
    Ok(())
}

#[tauri::command]
pub async fn insert_text(text: String) -> Result<(), String> {
    // 1. 写入剪贴板
    write_clipboard(&text)?;
    
    // 2. 模拟 Ctrl+V
    simulate_paste()?;
    
    Ok(())
}

// Windows 模拟按键
#[cfg(target_os = "windows")]
fn simulate_copy() -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;
    
    unsafe {
        // 按下 Ctrl
        let mut inputs: [INPUT; 4] = std::mem::zeroed();
        
        inputs[0].r#type = INPUT_KEYBOARD;
        inputs[0].Anonymous.ki.wVk = VK_CONTROL;
        
        inputs[1].r#type = INPUT_KEYBOARD;
        inputs[1].Anonymous.ki.wVk = VK_C;
        
        inputs[2].r#type = INPUT_KEYBOARD;
        inputs[2].Anonymous.ki.wVk = VK_C;
        inputs[2].Anonymous.ki.dwFlags = KEYEVENTF_KEYUP;
        
        inputs[3].r#type = INPUT_KEYBOARD;
        inputs[3].Anonymous.ki.wVk = VK_CONTROL;
        inputs[3].Anonymous.ki.dwFlags = KEYEVENTF_KEYUP;
        
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
    
    Ok(())
}

#[cfg(target_os = "windows")]
fn simulate_paste() -> Result<(), String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;
    
    unsafe {
        let mut inputs: [INPUT; 4] = std::mem::zeroed();
        
        inputs[0].r#type = INPUT_KEYBOARD;
        inputs[0].Anonymous.ki.wVk = VK_CONTROL;
        
        inputs[1].r#type = INPUT_KEYBOARD;
        inputs[1].Anonymous.ki.wVk = VK_V;
        
        inputs[2].r#type = INPUT_KEYBOARD;
        inputs[2].Anonymous.ki.wVk = VK_V;
        inputs[2].Anonymous.ki.dwFlags = KEYEVENTF_KEYUP;
        
        inputs[3].r#type = INPUT_KEYBOARD;
        inputs[3].Anonymous.ki.wVk = VK_CONTROL;
        inputs[3].Anonymous.ki.dwFlags = KEYEVENTF_KEYUP;
        
        SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
    }
    
    Ok(())
}

fn read_clipboard() -> Result<String, Box<dyn std::error::Error>> {
    // 使用 clipboard crate 或系统 API
    Ok(String::new()) // 简化，实际需实现
}

fn write_clipboard(text: &str) -> Result<(), String> {
    // 使用 clipboard crate 或系统 API
    Ok(()) // 简化，实际需实现
}
