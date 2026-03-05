//! 剪贴板模块 - 支持图片写入
//! 
//! 使用 Windows 原生 API 将 PNG 图片写入剪贴板

#[cfg(windows)]
use windows::Win32::System::DataExchange::{
    OpenClipboard, CloseClipboard, EmptyClipboard, SetClipboardData
};
#[cfg(windows)]
use windows::Win32::System::Memory::{
    GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE
};
#[cfg(windows)]
use windows::Win32::Foundation::HANDLE;

// CF_DIB 剪贴板格式常量
#[cfg(windows)]
const CF_DIB: u32 = 8;

/// 将 PNG 图片数据写入剪贴板（Windows）
#[cfg(windows)]
pub fn write_image_to_clipboard(png_data: &[u8]) -> Result<(), String> {
    use image::ImageReader;
    use std::io::Cursor;
    
    crate::log!("=== 写入图片到剪贴板 ===");
    crate::log!("PNG 数据大小: {} 字节", png_data.len());
    
    // 解码 PNG 图片
    let img = ImageReader::new(Cursor::new(png_data))
        .with_guessed_format()
        .map_err(|e| format!("无法识别图片格式: {}", e))?
        .decode()
        .map_err(|e| format!("解码图片失败: {}", e))?;
    
    let rgba = img.to_rgba8();
    let width = rgba.width();
    let height = rgba.height();
    
    crate::log!("图片尺寸: {}x{}", width, height);
    
    // 创建 DIB (Device Independent Bitmap) 数据
    // BITMAPINFOHEADER 结构 (40 字节)
    let header_size: u32 = 40;
    let row_size = ((width * 4 + 3) / 4) * 4; // 每行 4 字节对齐
    let image_size = row_size * height;
    let total_size = header_size as usize + image_size as usize;
    
    let mut dib_data = vec![0u8; total_size];
    
    // 填充 BITMAPINFOHEADER
    // biSize (4 bytes)
    dib_data[0..4].copy_from_slice(&header_size.to_le_bytes());
    // biWidth (4 bytes)
    dib_data[4..8].copy_from_slice(&(width as i32).to_le_bytes());
    // biHeight (4 bytes) - 正值表示自底向上
    dib_data[8..12].copy_from_slice(&(height as i32).to_le_bytes());
    // biPlanes (2 bytes)
    dib_data[12..14].copy_from_slice(&1u16.to_le_bytes());
    // biBitCount (2 bytes) - 32位 BGRA
    dib_data[14..16].copy_from_slice(&32u16.to_le_bytes());
    // biCompression (4 bytes) - BI_RGB = 0
    dib_data[16..20].copy_from_slice(&0u32.to_le_bytes());
    // biSizeImage (4 bytes)
    dib_data[20..24].copy_from_slice(&image_size.to_le_bytes());
    // biXPelsPerMeter, biYPelsPerMeter, biClrUsed, biClrImportant (各 4 bytes)
    // 保持为 0
    
    // 填充像素数据 (BGRA 格式，自底向上)
    let pixel_offset = header_size as usize;
    for y in 0..height {
        let src_row = (height - 1 - y) as usize; // 翻转 Y 轴
        for x in 0..width {
            let src_idx = (src_row * width as usize + x as usize) * 4;
            let dst_idx = pixel_offset + (y as usize * row_size as usize) + (x as usize * 4);
            
            // RGBA -> BGRA
            dib_data[dst_idx] = rgba.as_raw()[src_idx + 2];     // B
            dib_data[dst_idx + 1] = rgba.as_raw()[src_idx + 1]; // G
            dib_data[dst_idx + 2] = rgba.as_raw()[src_idx];     // R
            dib_data[dst_idx + 3] = rgba.as_raw()[src_idx + 3]; // A
        }
    }
    
    crate::log!("DIB 数据大小: {} 字节", dib_data.len());
    
    // 写入剪贴板
    unsafe {
        // 打开剪贴板
        if OpenClipboard(None).is_err() {
            return Err("无法打开剪贴板".to_string());
        }
        
        // 清空剪贴板
        if EmptyClipboard().is_err() {
            CloseClipboard().ok();
            return Err("无法清空剪贴板".to_string());
        }
        
        // 分配全局内存
        let hmem = GlobalAlloc(GMEM_MOVEABLE, dib_data.len())
            .map_err(|e| {
                CloseClipboard().ok();
                format!("分配内存失败: {}", e)
            })?;
        
        // 锁定内存并复制数据
        let ptr = GlobalLock(hmem);
        if ptr.is_null() {
            CloseClipboard().ok();
            return Err("锁定内存失败".to_string());
        }
        
        std::ptr::copy_nonoverlapping(dib_data.as_ptr(), ptr as *mut u8, dib_data.len());
        GlobalUnlock(hmem).ok();
        
        // 设置剪贴板数据
        let result = SetClipboardData(CF_DIB, HANDLE(hmem.0));
        
        // 关闭剪贴板
        CloseClipboard().ok();
        
        if result.is_err() {
            return Err("设置剪贴板数据失败".to_string());
        }
        
        crate::log!("图片已写入剪贴板");
    }
    
    Ok(())
}

#[cfg(not(windows))]
pub fn write_image_to_clipboard(_png_data: &[u8]) -> Result<(), String> {
    Err("图片剪贴板功能仅支持 Windows".to_string())
}
