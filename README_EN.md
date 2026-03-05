# GenQuick

<div align="center">

![GenQuick Logo](genquick-script/GenQuick.png)

**AI-Powered Assistant for Enhanced Productivity**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/genquick)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/tauri-2.0-orange.svg)](https://tauri.app)
[![Vue](https://img.shields.io/badge/vue-3.5-brightgreen.svg)](https://vuejs.org)

English | [简体中文](README.md)

</div>

---

## Introduction

**GenQuick** is a powerful AI-powered assistant desktop application built with **Tauri 2 + Vue 3 + TypeScript + Rust**. It provides instant access to AI capabilities through a global keyboard shortcut, supporting multiple AI models for text processing, chart generation, image editing, and more.

**Core Features:**

- Fast & Efficient - Launch instantly with `Alt + 1`, auto-capture selected text
- Multi-Model Support - Support OpenAI, Claude, Gemini, Ollama and more
- Smart Prompts - 15 built-in professional prompts, fully customizable
- Chart Generation - Support 5 chart types: Mermaid, Graphviz, ECharts, Word Cloud, Mind Map
- Image Editor - Built-in image editor with annotation, mosaic, and text tools
- Theme Switching - Light/Dark/System theme modes
- Local Storage - All configurations stored locally to protect your privacy

---

## Key Features

### Quick Menu System

- Global Hotkey: Press `Alt + 1` to launch the app instantly
- Smart Positioning: Window appears near your mouse cursor
- Auto-Capture: Automatically grabs selected text from any application
- Quick Actions: Insert, replace, or append text with one click

### AI Text Processing

**Built-in Prompts (15 types):**

| Category | Prompts |
|----------|---------|
| Optimization | Question Optimization, Professional Optimization, Basic Optimization, Step Planning |
| Writing | Smart Polishing, Content Expansion, Summary Extraction |
| Translation | English-Chinese Expert, Translate to English, Translate to Chinese |
| Office Work | Daily Report, Remove AI Tone |
| Prompt Engineering | System Prompt Optimization, Professional System Prompt |

**Prompt Management:**

- Custom prompt creation
- Category-based organization
- Drag-and-drop sorting
- Prompt scoring and optimization suggestions

### Chart Generation

Supports 5 mainstream chart types:

| Chart Type | Use Cases | Examples |
|------------|-----------|----------|
| Mermaid | Flowcharts, Sequence Diagrams, Class Diagrams, State Diagrams | Process Design, System Architecture |
| Graphviz | Structure Diagrams, Relationship Graphs | Complex Relationship Visualization |
| ECharts | Data Visualization, Statistical Charts | Data Analysis, Reports |
| Word Cloud | Text Analysis, Keyword Extraction | Article Keyword Visualization |
| Markmap | Mind Maps | Knowledge Organization, Brainstorming |

**Chart Features:**

- Real-time preview
- Export as PNG images
- Copy to clipboard
- Custom styling

### Image Editor

Built-in image editor powered by Fabric.js:

**Tools:**
- Brush, Highlighter, Eraser
- Line, Arrow, Rectangle, Circle
- Text Annotation
- Mosaic/Pixelation

**Actions:**
- Undo/Redo
- Copy to clipboard
- Insert into documents

### Settings Management

**General Settings:**
- Auto-start on boot
- Theme mode switching
- Custom hotkeys
- Language settings

**API Configuration:**
- Multi-configuration management
- One-click switching
- Supported models: OpenAI (Compatible), Claude, Gemini, Ollama

**Prompt Management:**
- View built-in prompts
- Add custom prompts
- Prompt optimization suggestions
- Prompt scoring system

---

## Quick Start

### Requirements

- Node.js: >= 18.0.0
- pnpm: >= 8.0.0 (recommended) or npm/yarn
- Rust: >= 1.70.0
- OS: Windows 10/11, macOS 10.15+, Linux

### Build from Source

```bash
# Clone the repository
git clone https://gitee.com/fall-in-love-with-hawaii/gen-quick.git
cd gen-quick

# Navigate to frontend directory
cd quickui

# Install dependencies
pnpm install

# Development mode
pnpm tauri dev

# Production build
pnpm tauri build
```

After building, the installation package will be located in `quickui/src-tauri/target/release/bundle/`.

### Development Commands

```bash
# Frontend development
pnpm dev

# Frontend build
pnpm build

# Tauri development mode
pnpm tauri dev

# Tauri production build
pnpm tauri build
```

---

## Usage Guide

### First Time Setup

1. **Configure API**
   - Click tray icon → Settings
   - Go to "Model Configuration"
   - Add your API configuration (API Key, Endpoint, Model)
   - Click "Activate" button

2. **Set Hotkey** (Optional)
   - Go to "General Settings"
   - Modify hotkey (default Alt+1)

3. **Start Using**
   - Select text in any application
   - Press `Alt + 1` to launch GenQuick
   - Choose a prompt to process

### Common Operations

**Text Processing:**

```
1. Select text → Alt+1 → Choose prompt → View result
2. Result operations:
   - Copy: Copy to clipboard
   - Insert: Insert at original position
   - Replace: Replace selected text
   - Append: Append to end
```

**Chart Generation:**

```
1. Select text → Alt+1 → Switch to "Chart Generation" tab
2. Select chart type
3. AI automatically generates chart code
4. Preview, export or copy
```

**Image Editing:**

```
1. Take screenshot or open image
2. Use toolbar for annotations
3. Copy or insert into document
```

---

## Project Structure

```
gen-quick/
├── quickui/                    # Frontend project
│   ├── src/
│   │   ├── components/         # Vue components (23)
│   │   │   ├── ChartPanel.vue  # Chart panel
│   │   │   ├── QuickMenu.vue   # Quick menu
│   │   │   ├── ResultPanel.vue # Result panel
│   │   │   ├── ImageEditor/    # Image editor
│   │   │   ├── settings/       # Settings components (8)
│   │   │   └── common/         # Common components
│   │   ├── views/              # Page views
│   │   │   ├── MainView.vue    # Main view
│   │   │   └── SettingsView.vue # Settings view
│   │   ├── stores/             # Pinia state management
│   │   │   ├── config.ts       # API configuration
│   │   │   ├── prompts.ts      # Prompt management
│   │   │   └── settings.ts     # App settings
│   │   ├── composables/        # Composable functions
│   │   │   ├── useAI.ts        # AI requests
│   │   │   └── useToast.ts     # Toast messages
│   │   ├── utils/              # Utility functions
│   │   │   ├── chartRenderer.ts # Chart rendering
│   │   │   └── imageProcessor.ts # Image processing
│   │   ├── types/              # TypeScript types
│   │   ├── styles/             # Style files (17)
│   │   └── assets/             # Static assets
│   ├── src-tauri/              # Rust backend
│   │   ├── src/
│   │   │   ├── lib.rs          # Main library entry
│   │   │   ├── ai.rs           # AI request handling
│   │   │   ├── keyboard.rs     # Keyboard monitoring
│   │   │   ├── clipboard.rs    # Clipboard operations
│   │   │   ├── config.rs       # Configuration management
│   │   │   ├── settings.rs     # Settings management
│   │   │   ├── tray.rs         # System tray
│   │   │   └── commands/       # Tauri commands
│   │   ├── Cargo.toml          # Rust dependencies
│   │   └── tauri.conf.json     # Tauri configuration
│   ├── package.json            # npm dependencies
│   ├── vite.config.ts          # Vite configuration
│   └── tsconfig.json           # TypeScript configuration
└── genquick-script/            # Icon resources
    ├── GenQuick.png            # Source icon (1024x1024)
    ├── convert_icons.py        # Icon conversion script
    └── icons/                  # Generated icons (16)
```

---

## Technical Architecture

### Frontend Stack

- Framework: Vue 3 (Composition API) + TypeScript
- Build Tool: Vite 6
- State Management: Pinia 3
- Router: Vue Router 4
- UI: Custom CSS/SCSS (no third-party component libraries)
- Chart Libraries:
  - Mermaid 11 (Flowcharts)
  - ECharts 5 (Data Visualization)
  - Graphviz (Structure Diagrams)
  - Markmap (Mind Maps)
- Image Editing: Fabric.js 7
- Others:
  - marked (Markdown parsing)
  - highlight.js (Code highlighting)
  - html2canvas (Screenshots)

### Backend Stack

- Desktop Framework: Tauri 2
- Language: Rust (Edition 2021)
- Async Runtime: Tokio
- HTTP Client: reqwest
- Serialization: serde + serde_json
- System Integration:
  - enigo (Keyboard/mouse simulation)
  - rdev (Global event listening)
  - tauri-plugin-clipboard-manager (Clipboard)
  - tauri-plugin-global-shortcut (Global hotkeys)

### Data Flow

```
User selects text
    ↓
Press Alt+1 to launch
    ↓
Rust Backend: Backup clipboard → Simulate Ctrl+C → Read text → Restore clipboard
    ↓
Frontend: Display quick menu
    ↓
User selects prompt
    ↓
Rust Backend: Send AI request (streaming)
    ↓
Frontend: Display result in real-time
    ↓
User action: Copy/Insert/Replace
    ↓
Rust Backend: Write to clipboard/Simulate keyboard operations
```

---

## Data Storage

All data is stored locally in the `data/` folder in the application directory:

```
data/
├── api-config.json      # API configuration
├── prompt-config.json   # Prompt configuration
├── settings.json        # App settings
├── text-cache.json      # Text cache
└── app.log              # Application log
```

**Privacy Protection:**

- All configurations stored locally
- No user data uploaded
- API Key encrypted storage
- Supports fully offline usage (Ollama mode)

---

## Performance Optimization

- Fast Startup: Tauri 2 optimized, startup time < 1s
- Small Size: Installation package ~10MB (Windows)
- Low Memory: Runtime memory usage < 100MB
- Smooth Animation: 60fps smooth experience
- Smart Caching: Prompt and configuration caching

---

## FAQ

### Q: How to configure API?

**A:**

1. Open Settings → Model Configuration
2. Click "Add Configuration"
3. Select API type (OpenAI/Claude/Gemini/Ollama)
4. Fill in Endpoint, API Key, Model
5. Click "Activate" button

### Q: Does it support Ollama local models?

**A:** Yes! Configuration steps:

1. Install and start Ollama
2. Add configuration, type select "Ollama"
3. Endpoint: `http://localhost:11434`
4. Model: model name (e.g., `llama3`, `qwen2.5`)
5. Leave API Key empty

### Q: How to modify hotkey?

**A:**

1. Open Settings → General Settings
2. Modify hotkey (supports Ctrl/Shift/Alt + letter/number)
3. Takes effect immediately after saving

### Q: Where is data stored?

**A:** All data is stored in the `data/` folder in the application directory, including:

- API configuration
- Prompt configuration
- App settings
- Log files

### Q: How to add custom prompts?

**A:**

1. Open Settings → Prompt Management
2. Switch to "Custom Prompts" tab
3. Click "Add Prompt"
4. Fill in name, icon, prompt content
5. Save and start using

### Q: Does it support image input?

**A:** Yes! In conversation mode:

1. Paste image (Ctrl+V)
2. Select image file
3. AI will automatically recognize image content

### Q: How to export charts?

**A:**

1. After generating chart, click "Copy Image" button
2. Chart will be copied to clipboard as PNG
3. Can paste directly into any application

---

## Contributing

We welcome all forms of contributions!

### How to Contribute

1. Fork this repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Submit Pull Request

---

## License

This project is open-sourced under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2024 GenQuick

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgments

Thanks to these open-source projects:

- [Tauri](https://tauri.app/) - Cross-platform desktop application framework
- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [Mermaid](https://mermaid.js.org/) - JavaScript-based diagramming tool
- [ECharts](https://echarts.apache.org/) - Powerful visualization library
- [Fabric.js](http://fabricjs.com/) - Canvas library
- [Markmap](https://markmap.js.org/) - Mind map library
- [prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) - Prompt optimization framework and evaluation tools by [linshenkx](https://github.com/linshenkx)

### Special Thanks

Special thanks to all friends who follow, use, and support this project! Your feedback and suggestions are the driving force for continuous improvement.

---

## Contact

- Project Homepage: [https://github.com/Sweetberrys/GenQuick](https://github.com/Sweetberrys/GenQuick)
- Issue Tracker: [Issues](https://github.com/Sweetberrys/GenQuick/issues)
- Discussions: [Discussions](https://github.com/Sweetberrys/GenQuick/discussions)

### WeChat

Welcome to scan the QR code to add WeChat and exchange project usage experiences and suggestions:

![WeChat QR Code](genquick-script/project-image/wx.png)

---

<div align="center">

**If this project helps you, please give it a Star!**

Made with love by GenQuick Team

</div>
