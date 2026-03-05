"""
Tauri 图标转换工具
将 GenQuick.png 转换为 Tauri 所需的所有图标格式
依赖: pip install Pillow
"""

from PIL import Image
import os

# 源图片路径
SOURCE_IMAGE = "GenQuick.png"

# PNG 图标配置: (文件名, 尺寸)
PNG_ICONS = [
    ("32x32.png", 32),
    ("128x128.png", 128),
    ("128x128@2x.png", 256),
    ("icon.png", 512),
    # Windows Store logos
    ("Square30x30Logo.png", 30),
    ("Square44x44Logo.png", 44),
    ("Square71x71Logo.png", 71),
    ("Square89x89Logo.png", 89),
    ("Square107x107Logo.png", 107),
    ("Square142x142Logo.png", 142),
    ("Square150x150Logo.png", 150),
    ("Square284x284Logo.png", 284),
    ("Square310x310Logo.png", 310),
    ("StoreLogo.png", 50),
]

# ICO 文件包含的尺寸
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

# ICNS 文件包含的尺寸
ICNS_SIZES = [16, 32, 64, 128, 256, 512, 1024]


def resize_image(img: Image.Image, size: int) -> Image.Image:
    """高质量缩放图片"""
    return img.resize((size, size), Image.Resampling.LANCZOS)


def generate_png_icons(source: Image.Image, output_dir: str):
    """生成所有 PNG 图标"""
    print("生成 PNG 图标...")
    for filename, size in PNG_ICONS:
        output_path = os.path.join(output_dir, filename)
        resized = resize_image(source, size)
        resized.save(output_path, "PNG")
        print(f"  ✓ {filename} ({size}x{size})")


def generate_ico(source: Image.Image, output_dir: str):
    """生成 Windows ICO 文件"""
    print("生成 ICO 文件...")
    output_path = os.path.join(output_dir, "icon.ico")
    
    # 创建多尺寸图标列表
    icons = [resize_image(source, size) for size in ICO_SIZES]
    
    # 保存为 ICO (第一个图像调用 save，其余作为 append_images)
    icons[0].save(
        output_path,
        format="ICO",
        sizes=[(s, s) for s in ICO_SIZES],
        append_images=icons[1:]
    )
    print(f"  ✓ icon.ico (包含尺寸: {ICO_SIZES})")


def generate_icns(source: Image.Image, output_dir: str):
    """生成 macOS ICNS 文件"""
    print("生成 ICNS 文件...")
    output_path = os.path.join(output_dir, "icon.icns")
    
    # Pillow 支持直接保存 ICNS，会自动处理多尺寸
    # 使用最大尺寸的图像
    large_icon = resize_image(source, 1024)
    large_icon.save(output_path, format="ICNS")
    print(f"  ✓ icon.icns")


def main():
    # 获取脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_path = os.path.join(script_dir, SOURCE_IMAGE)
    
    # 输出目录：在脚本所在目录下创建 icons 文件夹
    output_dir = os.path.join(script_dir, "icons")
    
    # 检查源文件
    if not os.path.exists(source_path):
        print(f"错误: 找不到源图片 {source_path}")
        return
    
    # 创建输出目录
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"创建输出目录: {output_dir}")
    
    # 打开源图片
    print(f"读取源图片: {SOURCE_IMAGE}")
    source = Image.open(source_path)
    
    # 确保是 RGBA 模式
    if source.mode != "RGBA":
        source = source.convert("RGBA")
    
    print(f"源图片尺寸: {source.size[0]}x{source.size[1]}")
    print(f"输出目录: {output_dir}")
    print("-" * 40)
    
    # 生成所有图标到 icons 目录
    generate_png_icons(source, output_dir)
    generate_ico(source, output_dir)
    generate_icns(source, output_dir)
    
    print("-" * 40)
    print("✅ 所有图标生成完成!")
    print(f"📁 图标已保存到: {output_dir}")


if __name__ == "__main__":
    main()
