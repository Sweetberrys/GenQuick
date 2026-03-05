use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// API 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub api_type: String,
    pub endpoint: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    pub model: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfigStore {
    pub configs: Vec<ApiConfig>,
    #[serde(rename = "activeId")]
    pub active_id: Option<String>,
}

// 提示词配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompt {
    pub id: String,
    pub icon: String,
    pub name: String,
    pub prompt: String,
    pub shortcut: Option<String>,
    #[serde(rename = "isBuiltin")]
    pub is_builtin: bool,
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
    #[serde(rename = "folderId")]
    pub folder_id: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "sortOrder")]
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptFolder {
    pub id: String,
    pub name: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptConfigStore {
    pub prompts: Vec<Prompt>,
    #[serde(default)]
    pub folders: Vec<PromptFolder>,
    #[serde(default, rename = "builtinOrder")]
    pub builtin_order: Vec<String>,
}

// 获取数据目录（应用程序同级目录下的 data 文件夹）
pub fn get_data_dir() -> PathBuf {
    // 获取可执行文件所在目录
    let data_dir = std::env::current_exe()
        .ok()
        .and_then(|exe_path| exe_path.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("data");
    
    // 确保目录存在
    if !data_dir.exists() {
        let _ = fs::create_dir_all(&data_dir);
    }
    
    data_dir
}

// 获取 API 配置文件路径
pub fn get_api_config_path() -> PathBuf {
    get_data_dir().join("api-config.json")
}

// 获取提示词配置文件路径
pub fn get_prompt_config_path() -> PathBuf {
    get_data_dir().join("prompt-config.json")
}

// 读取 API 配置
pub fn read_api_config() -> ApiConfigStore {
    let path = get_api_config_path();
    
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    
    // 返回默认配置
    ApiConfigStore {
        configs: vec![],
        active_id: None,
    }
}

// 保存 API 配置
pub fn save_api_config(config: &ApiConfigStore) -> Result<(), String> {
    let path = get_api_config_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(())
}

// 读取提示词配置
pub fn read_prompt_config() -> PromptConfigStore {
    let path = get_prompt_config_path();
    crate::log!("[config] 读取提示词配置: {:?}", path);
    
    if path.exists() {
        crate::log!("[config] 配置文件存在");
        if let Ok(content) = fs::read_to_string(&path) {
            crate::log!("[config] 文件内容长度: {} 字节", content.len());
            if let Ok(config) = serde_json::from_str::<PromptConfigStore>(&content) {
                crate::log!("[config] 解析成功，提示词数量: {}", config.prompts.len());
                return config;
            } else {
                crate::log!("[config] JSON 解析失败");
            }
        }
    } else {
        crate::log!("[config] 配置文件不存在，自动创建默认配置");
    }
    
    // 返回默认配置（空列表，内置提示词由前端管理）
    let default_config = PromptConfigStore {
        prompts: vec![],
        folders: vec![],
        builtin_order: vec![],
    };
    
    // 自动创建配置文件
    if let Err(e) = save_prompt_config(&default_config) {
        crate::log!("[config] 自动创建配置文件失败: {}", e);
    } else {
        crate::log!("[config] 已自动创建默认配置文件");
    }
    
    default_config
}

// 保存提示词配置
pub fn save_prompt_config(config: &PromptConfigStore) -> Result<(), String> {
    let path = get_prompt_config_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(())
}

// ============ 文本缓存（持久化到 JSON） ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextCache {
    pub text: String,
    pub timestamp: i64,
    pub source: String,  // "clipboard" | "selection"
}

// 获取文本缓存文件路径
pub fn get_text_cache_path() -> PathBuf {
    get_data_dir().join("text-cache.json")
}

// 读取缓存的文本
pub fn read_text_cache() -> Option<TextCache> {
    let path = get_text_cache_path();
    
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(cache) = serde_json::from_str::<TextCache>(&content) {
                return Some(cache);
            }
        }
    }
    
    None
}

// 保存文本到缓存
pub fn save_text_cache(text: &str, source: &str) -> Result<(), String> {
    let path = get_text_cache_path();
    
    let cache = TextCache {
        text: text.to_string(),
        timestamp: chrono::Utc::now().timestamp(),
        source: source.to_string(),
    };
    
    let content = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(())
}

// 清空文本缓存
pub fn clear_text_cache() -> Result<(), String> {
    let path = get_text_cache_path();
    
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("删除文件失败: {}", e))?;
    }
    
    Ok(())
}
