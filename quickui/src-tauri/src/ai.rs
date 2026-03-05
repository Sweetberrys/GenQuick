//! AI 请求模块
//! 
//! 处理与 AI API 的通信，支持流式响应

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

/// AI 请求取消标志
pub static AI_CANCEL: AtomicBool = AtomicBool::new(false);

// ============ 请求/响应结构体 ============

#[derive(Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
}

// Ollama 请求格式
#[derive(Serialize)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<OllamaChatMessage>,
    pub stream: bool,
}

#[derive(Serialize)]
pub struct OllamaChatMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,
}

// Ollama 响应格式
#[derive(Deserialize)]
struct OllamaStreamResponse {
    message: Option<OllamaMessageResponse>,
    done: bool,
}

#[derive(Deserialize)]
struct OllamaMessageResponse {
    content: Option<String>,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Parts(Vec<ContentPart>),
}

// 为 MessageContent 实现 Deserialize
impl<'de> Deserialize<'de> for MessageContent {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        // 简单处理：总是反序列化为文本
        let s = String::deserialize(deserializer)?;
        Ok(MessageContent::Text(s))
    }
}

impl Clone for MessageContent {
    fn clone(&self) -> Self {
        match self {
            MessageContent::Text(s) => MessageContent::Text(s.clone()),
            MessageContent::Parts(parts) => MessageContent::Parts(parts.clone()),
        }
    }
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum ContentPart {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrl },
}

impl Clone for ContentPart {
    fn clone(&self) -> Self {
        match self {
            ContentPart::Text { text } => ContentPart::Text { text: text.clone() },
            ContentPart::ImageUrl { image_url } => ContentPart::ImageUrl { 
                image_url: ImageUrl { url: image_url.url.clone() } 
            },
        }
    }
}

#[derive(Serialize)]
pub struct ImageUrl {
    pub url: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: MessageContent,
}

/// 简单消息结构（从前端接收）
#[derive(Deserialize, Clone)]
pub struct SimpleMessage {
    pub role: String,
    pub content: String,
    pub images: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct StreamResponse {
    choices: Option<Vec<Choice>>,
}

#[derive(Deserialize)]
struct Choice {
    delta: Delta,
}

#[derive(Deserialize)]
struct Delta {
    content: Option<String>,
}

// ============ AI 请求函数 ============

/// 发送 AI 请求并处理流式响应（支持对话历史）
pub async fn send_ai_request(
    app: &AppHandle,
    endpoint: String,
    api_key: String,
    model: String,
    api_type: String,
    messages: Vec<SimpleMessage>,
    request_id: Option<String>,
) -> Result<(), String> {
    AI_CANCEL.store(false, Ordering::SeqCst);

    crate::log!("=== AI 请求开始 ===");
    crate::log!("API 类型: {}", api_type);
    crate::log!("模型: {}", model);
    crate::log!("消息数量: {}", messages.len());

    // 根据 API 类型选择不同的处理方式
    match api_type.as_str() {
        "ollama" => send_ollama_request(app, endpoint, model, messages, request_id).await,
        _ => send_openai_compatible_request(app, endpoint, api_key, model, messages, request_id).await,
    }
}

/// 发送 Ollama 请求
async fn send_ollama_request(
    app: &AppHandle,
    endpoint: String,
    model: String,
    messages: Vec<SimpleMessage>,
    request_id: Option<String>,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;
    
    let url = format!("{}/api/chat", endpoint.trim_end_matches('/'));

    // 构建 Ollama 消息列表
    let ollama_messages: Vec<OllamaChatMessage> = messages.iter().map(|msg| {
        OllamaChatMessage {
            role: msg.role.clone(),
            content: msg.content.clone(),
            images: msg.images.clone(),
        }
    }).collect();

    let request = OllamaChatRequest {
        model,
        messages: ollama_messages,
        stream: true,
    };

    crate::log!("Ollama 请求 URL: {}", url);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Ollama API 错误 {}: {}", status, text));
    }

    process_ollama_stream_response(app, response, request_id).await
}

/// 发送 OpenAI 兼容请求（OpenAI、Claude、Gemini 等）
async fn send_openai_compatible_request(
    app: &AppHandle,
    endpoint: String,
    api_key: String,
    model: String,
    messages: Vec<SimpleMessage>,
    request_id: Option<String>,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;
    
    let url = format!("{}/chat/completions", endpoint.trim_end_matches('/'));

    // 构建消息列表
    let chat_messages: Vec<ChatMessage> = messages.iter().map(|msg| {
        let content = build_message_content(&msg.content, msg.images.as_ref());
        ChatMessage {
            role: msg.role.clone(),
            content,
        }
    }).collect();

    let request = ChatRequest {
        model,
        messages: chat_messages,
        stream: true,
    };

    crate::log!("请求 URL: {}", url);

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API 错误 {}: {}", status, text));
    }

    process_stream_response(app, response, request_id).await
}

/// 构建消息内容（支持图片）
fn build_message_content(prompt: &str, images: Option<&Vec<String>>) -> MessageContent {
    if let Some(imgs) = images {
        if !imgs.is_empty() {
            crate::log!("使用多部分内容格式（含图片）");
            let mut parts: Vec<ContentPart> = Vec::new();
            
            // 添加图片
            for img_base64 in imgs {
                parts.push(ContentPart::ImageUrl {
                    image_url: ImageUrl {
                        url: format!("data:image/jpeg;base64,{}", img_base64),
                    },
                });
            }
            
            // 添加文本
            if !prompt.is_empty() {
                parts.push(ContentPart::Text { text: prompt.to_string() });
            }
            
            return MessageContent::Parts(parts);
        }
    }
    
    crate::log!("使用纯文本格式");
    MessageContent::Text(prompt.to_string())
}

/// 处理 Ollama 流式响应
async fn process_ollama_stream_response(app: &AppHandle, response: reqwest::Response, request_id: Option<String>) -> Result<(), String> {
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    // 根据是否有 request_id 决定事件名称
    let chunk_event = match &request_id {
        Some(id) => format!("ai-chunk-{}", id),
        None => "ai-chunk".to_string(),
    };
    let done_event = match &request_id {
        Some(id) => format!("ai-done-{}", id),
        None => "ai-done".to_string(),
    };

    while let Some(chunk_result) = stream.next().await {
        if AI_CANCEL.load(Ordering::SeqCst) {
            let _ = app.emit(&done_event, ());
            return Ok(());
        }

        let chunk = chunk_result.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Ollama 每行是一个完整的 JSON 对象
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Ok(response) = serde_json::from_str::<OllamaStreamResponse>(&line) {
                if let Some(message) = response.message {
                    if let Some(content) = message.content {
                        if !content.is_empty() {
                            let _ = app.emit(&chunk_event, content);
                        }
                    }
                }
                
                if response.done {
                    let _ = app.emit(&done_event, ());
                    return Ok(());
                }
            }
        }
    }

    let _ = app.emit(&done_event, ());
    Ok(())
}

/// 处理流式响应（OpenAI 兼容格式）
async fn process_stream_response(app: &AppHandle, response: reqwest::Response, request_id: Option<String>) -> Result<(), String> {
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    // 根据是否有 request_id 决定事件名称
    let chunk_event = match &request_id {
        Some(id) => format!("ai-chunk-{}", id),
        None => "ai-chunk".to_string(),
    };
    let done_event = match &request_id {
        Some(id) => format!("ai-done-{}", id),
        None => "ai-done".to_string(),
    };

    while let Some(chunk_result) = stream.next().await {
        if AI_CANCEL.load(Ordering::SeqCst) {
            let _ = app.emit(&done_event, ());
            return Ok(());
        }

        let chunk = chunk_result.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];
                
                if data == "[DONE]" {
                    let _ = app.emit(&done_event, ());
                    return Ok(());
                }

                if let Ok(response) = serde_json::from_str::<StreamResponse>(data) {
                    if let Some(choices) = response.choices {
                        if let Some(choice) = choices.first() {
                            if let Some(content) = &choice.delta.content {
                                let _ = app.emit(&chunk_event, content.clone());
                            }
                        }
                    }
                }
            }
        }
    }

    let _ = app.emit(&done_event, ());
    Ok(())
}

/// 取消 AI 请求
pub fn cancel_ai_request() {
    AI_CANCEL.store(true, Ordering::SeqCst);
}

/// 发送同步 AI 请求（非流式，返回完整响应）
pub async fn send_ai_request_sync(
    endpoint: String,
    api_key: String,
    model: String,
    messages: Vec<SimpleMessage>,
) -> Result<String, String> {
    crate::log!("=== AI 同步请求开始 ===");
    crate::log!("模型: {}", model);
    crate::log!("消息数量: {}", messages.len());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;
    
    let url = format!("{}/chat/completions", endpoint.trim_end_matches('/'));

    // 构建消息列表
    let chat_messages: Vec<ChatMessage> = messages.iter().map(|msg| {
        let content = build_message_content(&msg.content, msg.images.as_ref());
        ChatMessage {
            role: msg.role.clone(),
            content,
        }
    }).collect();

    // 非流式请求
    let request = serde_json::json!({
        "model": model,
        "messages": chat_messages,
        "stream": false
    });

    crate::log!("请求 URL: {}", url);

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API 错误 {}: {}", status, text));
    }

    // 解析响应
    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    // 提取内容
    let content = response_json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("无法获取响应内容")?
        .to_string();

    crate::log!("=== AI 同步请求完成 ===");
    crate::log!("响应长度: {} 字符", content.len());

    Ok(content)
}
