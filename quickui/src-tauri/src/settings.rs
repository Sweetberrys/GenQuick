use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use crate::config::get_data_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub shortcut: String,
    pub theme: String,
    #[serde(rename = "autoStart")]
    pub auto_start: bool,
    pub language: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            shortcut: "Alt+1".to_string(),
            theme: "light".to_string(),
            auto_start: false,
            language: "zh-CN".to_string(),
        }
    }
}

fn get_settings_path() -> PathBuf {
    get_data_dir().join("settings.json")
}

pub fn read_settings() -> AppSettings {
    let path = get_settings_path();
    
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str(&content) {
                return settings;
            }
        }
    }
    
    AppSettings::default()
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(())
}

// 验证快捷键格式
pub fn validate_shortcut(shortcut: &str) -> bool {
    let parts: Vec<&str> = shortcut.split('+').collect();
    if parts.len() != 2 {
        return false;
    }
    
    let modifier = parts[0];
    let key = parts[1];
    
    // 验证修饰键
    if !["Ctrl", "Shift", "Alt"].contains(&modifier) {
        return false;
    }
    
    // 验证按键（A-Z 或 0-9）
    if key.len() != 1 {
        return false;
    }
    
    let c = key.chars().next().unwrap();
    c.is_ascii_uppercase() || c.is_ascii_digit()
}
