use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct StreamResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    delta: Delta,
}

#[derive(Deserialize)]
struct Delta {
    content: Option<String>,
}

#[tauri::command]
pub async fn ai_stream_request(
    app: AppHandle,
    endpoint: String,
    api_key: String,
    model: String,
    prompt: String,
) -> Result<(), String> {
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let client = Client::new();

    let request = ChatRequest {
        model,
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        stream: true,
    };

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API 请求失败: {}", response.status()));
    }

    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        if CANCEL_FLAG.load(Ordering::SeqCst) {
            break;
        }

        let chunk = chunk.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);

        // 解析 SSE 数据
        for line in text.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    break;
                }

                if let Ok(response) = serde_json::from_str::<StreamResponse>(data) {
                    if let Some(choice) = response.choices.first() {
                        if let Some(content) = &choice.delta.content {
                            // 发送到前端
                            let _ = app.emit("ai-stream", content.clone());
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn ai_cancel_request() -> Result<(), String> {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    Ok(())
}
