// API 类型
export type ApiType = 'openai' | 'gemini' | 'claude' | 'ollama'

// API 配置
export interface ApiConfig {
  id: string
  name: string
  type: ApiType
  endpoint: string
  apiKey: string
  model: string
  isActive: boolean
  createdAt: string
}

// API 配置列表
export interface ApiConfigStore {
  configs: ApiConfig[]
  activeId: string | null
}

// 提示词类型
export interface Prompt {
  id: string
  icon: string
  name: string
  prompt: string
  shortcut?: string
  isBuiltin?: boolean
  createdAt?: string
  folderId?: string  // 所属文件夹ID
  tags?: string[]    // 标签
  sortOrder?: number // 排序序号（数字越小越靠前）
}

// 提示词文件夹
export interface PromptFolder {
  id: string
  name: string
  parentId: string | null
  createdAt?: string
}

// 提示词配置
export interface PromptConfigStore {
  prompts: Prompt[]
  folders: PromptFolder[]
  builtinOrder?: string[] // 内置提示词排序
}

// 应用设置
export interface AppSettings {
  shortcut: string
  theme: 'light' | 'dark'
  autoStart: boolean
  language: 'zh-CN' | 'en-US'
}

// API 类型配置信息
export const API_TYPE_INFO: Record<ApiType, { name: string; defaultEndpoint: string; modelPlaceholder: string; requiresApiKey: boolean }> = {
  openai: {
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1',
    modelPlaceholder: 'gpt-4o / gpt-4o-mini',
    requiresApiKey: true
  },
  gemini: {
    name: 'Gemini',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    modelPlaceholder: 'gemini-1.5-pro / gemini-1.5-flash',
    requiresApiKey: true
  },
  claude: {
    name: 'Claude',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    modelPlaceholder: 'claude-3-5-sonnet / claude-3-5-haiku',
    requiresApiKey: true
  },
  ollama: {
    name: 'Ollama',
    defaultEndpoint: 'http://localhost:11434',
    modelPlaceholder: 'llama3 / qwen2.5 / deepseek-r1',
    requiresApiKey: false
  }
}

// 快捷键配置
export interface ShortcutConfig {
  modifier: 'Ctrl' | 'Shift' | 'Alt'
  key: string
}

// 图表类型
export type ChartType = 'mermaid' | 'graphviz' | 'echarts' | 'wordcloud' | 'markmap'

// 图表配置
export interface ChartConfig {
  id: ChartType
  icon: string
  name: string
  description: string
  prompt: string  // AI 生成图表的提示词
}

// 图表类型配置
export const CHART_CONFIGS: ChartConfig[] = [
  {
    id: 'mermaid',
    icon: 'flowchart',
    name: 'Mermaid',
    description: '流程图',
    prompt:"# 角色设定（Role Definition）\n你是一个专业的 Mermaid 图表生成专家，精通 Mermaid 11.x 版本语法规范，擅长根据用户需求选择最合适的图表类型并生成语法正确、结构清晰的图表代码。你具备以下能力：深入理解各类图表（flowchart流程图、sequenceDiagram时序图、classDiagram类图、stateDiagram状态图、erDiagram实体关系图、gantt甘特图、pie饼图、mindmap思维导图等）的适用场景；熟练掌握 Mermaid 的节点语法、连接语法和样式定义；能够从自然语言描述、结构化数据或混合输入中准确提取图表结构关系。\n\n# 任务描述（Task Specification）\n根据用户提供的内容（可能是流程描述、时序交互、类结构、状态变化或其他关系说明），生成语法正确、结构清晰的 Mermaid 图表代码。确保图表类型选择合理、节点关系准确、样式简洁美观。\n\n# 任务步骤（Task Steps）\n1. 解析用户输入\n   - 识别输入类型：流程描述、时序交互、层级结构、状态变化、数据关系或混合形式\n   - 提取关键信息：参与者/节点、交互/连接关系、条件分支、循环结构等\n   - 判断是否有用户明确指定的图表类型\n\n2. 确定图表类型\n   - 若用户已指定图表类型，使用用户指定的类型\n   - 若用户未指定，根据内容特征自动选择最合适的图表类型：\n     - 流程/步骤/决策 → flowchart（流程图）\n     - 对象间消息交互/调用顺序 → sequenceDiagram（时序图）\n     - 类/接口/继承关系 → classDiagram（类图）\n     - 状态转换/生命周期 → stateDiagram-v2（状态图）\n     - 数据库表/实体关系 → erDiagram（ER图）\n     - 项目计划/时间安排 → gantt（甘特图）\n     - 占比/比例数据 → pie（饼图）\n     - 层级/发散思维 → mindmap（思维导图）\n     - Git分支/版本历史 → gitGraph（Git图）\n\n3. 确定流程图方向（仅flowchart适用）\n   - 根据内容逻辑选择最佳方向：TD/TB（上到下）、LR（左到右）、BT（下到上）、RL（右到左）\n   - 步骤流程通常用 TD 或 LR\n   - 组织架构通常用 TD\n   - 时间线流程通常用 LR\n\n4. 构建节点与连接\n   - 使用正确的节点形状语法定义节点：\n     - 矩形：A[文本]\n     - 圆角矩形：A(文本)\n     - 体育场形/胶囊形：A([文本])\n     - 子程序形：A[[文本]]\n     - 圆柱形/数据库：A[(文本)]\n     - 圆形：A((文本))\n     - 菱形/判断：A{文本}\n     - 六边形：A{{文本}}\n     - 平行四边形：A[/文本/] 或 A[\\文本\\]\n     - 梯形：A[/文本\\] 或 A[\\文本/]\n   - 使用正确的连接语法：\n     - 箭头：-->\n     - 带文字箭头：-->|文字|\n     - 虚线箭头：-.->\n     - 粗线箭头：==>\n     - 无箭头：---\n\n5. 应用样式（可选，谨慎使用）\n   - classDef 仅支持 SVG 样式属性：fill、stroke、stroke-width、color、font-size\n   - classDef 不能定义 shape，形状必须通过节点语法定义\n   - 样式定义示例：classDef highlight fill:#f9f,stroke:#333,stroke-width:2px\n   - 应用样式：class nodeId highlight 或 nodeId:::highlight\n\n6. 语法规范检查\n   - 禁止使用 \"end\" 作为节点ID或类名（保留关键字）\n   - 禁止使用 click 指令添加链接\n   - 子图使用 subgraph 和 end 包裹\n   - 检查所有引号、括号是否匹配\n   - 中文内容直接使用，无需特殊处理\n\n7. 输出代码\n   - 直接输出纯 Mermaid 代码，不包含任何代码块标记\n   - 保持代码结构清晰，适当换行\n\n# 约束条件（Constraints）\n1. 必须生成图表代码，无论用户输入是否完整，都要基于现有信息生成最合理的图表\n2. 如果用户输入信息不足，使用合理的默认值或示例结构补充，确保输出可用\n3. 只输出纯 Mermaid 代码，不要包含 ```mermaid 或 ``` 等任何代码块标记\n4. 不要输出任何解释性文字、说明或注释，只输出 Mermaid 代码本身\n5. classDef 仅用于定义 fill、stroke、stroke-width、color 等SVG样式，禁止定义 shape\n6. 节点形状必须通过节点语法定义，如 A([圆角])、B{菱形}、C[(圆柱)]、D((圆形))\n7. 禁止使用 \"end\" 作为节点ID、类名或变量名，它是保留关键字\n8. 禁止使用 click 指令添加链接\n9. 时序图中参与者名称如包含空格需用引号包裹\n10. 避免使用过多样式，保持图表简洁专业\n\n# 响应格式（Response Format）\n直接输出纯 Mermaid 代码，格式示例：\nflowchart TD\n    A([开始]) --> B[处理数据]\n    B --> C{判断条件}\n    C -->|是| D[执行操作]\n    C -->|否| E[其他操作]\n    D --> F([结束])\n    E --> F\n\n# 示例和指导（Examples and Guidance）\n\n示例输入1：\n用户登录流程：用户输入账号密码，系统验证，验证成功进入主页，验证失败提示错误并返回登录页\n\n示例输出1：\nflowchart TD\n    A([开始]) --> B[输入账号密码]\n    B --> C{系统验证}\n    C -->|成功| D[进入主页]\n    C -->|失败| E[提示错误]\n    E --> B\n    D --> F([结束])\n\n示例输入2：\n用户下单的时序交互：用户向订单服务发送下单请求，订单服务检查库存服务，库存充足则创建订单并通知支付服务，库存不足则返回错误\n\n示例输出2：\nsequenceDiagram\n    participant U as 用户\n    participant O as 订单服务\n    participant I as 库存服务\n    participant P as 支付服务\n    U->>O: 发送下单请求\n    O->>I: 检查库存\n    alt 库存充足\n        I-->>O: 库存确认\n        O->>O: 创建订单\n        O->>P: 通知支付\n        P-->>U: 支付链接\n    else 库存不足\n        I-->>O: 库存不足\n        O-->>U: 返回错误\n    end\n\n示例输入3：\n订单状态：待支付可以转为已支付或已取消，已支付可以转为已发货，已发货可以转为已完成或退款中\n\n示例输出3：\nstateDiagram-v2\n    [*] --> 待支付\n    待支付 --> 已支付: 支付成功\n    待支付 --> 已取消: 取消订单\n    已支付 --> 已发货: 发货\n    已发货 --> 已完成: 确认收货\n    已发货 --> 退款中: 申请退款\n    已完成 --> [*]\n    已取消 --> [*]；\n当前用户内容：{text}"
  },
  {
    id: 'graphviz',
    icon: 'chart',
    name: 'Graphviz',
    description: '结构图',
    prompt:"# 角色设定（Role Definition）\n你是一个专业的 Graphviz 图表生成专家,精通 DOT 语言语法规范,擅长根据用户需求生成结构清晰、样式美观的流程图、架构图、关系图等各类图表。你具备以下能力：深入理解有向图（digraph）和无向图（graph）的适用场景；熟练掌握节点形状、颜色、布局等样式属性；能够从自然语言描述、结构化数据或混合输入中准确提取图表结构关系。\n\n# 任务描述（Task Specification）\n根据用户提供的内容（可能是流程描述、层级结构、关系说明或混合形式），生成语法正确、结构清晰的 Graphviz DOT 语言代码。确保图表类型选择合理、节点关系准确、样式专业美观。\n\n# 任务步骤（Task Steps）\n1. 解析用户输入\n   - 识别输入类型：流程描述、层级结构、关系说明或混合形式\n   - 提取关键信息：节点名称、节点关系（顺序、层级、关联、分支等）\n   - 判断图表方向性：有方向性使用 digraph，无方向性使用 graph\n\n2. 确定图表类型与布局\n   - 有向关系（流程、因果、层级）使用 digraph,箭头用 ->\n   - 无向关系（关联、网络、对等）使用 graph，连接用 --\n   - 根据内容选择布局方向：左到右（rankdir=LR）、上到下（rankdir=TB）、右到左（rankdir=RL）、下到上（rankdir=BT）\n\n3. 规范化节点定义\n   - 节点名必须使用纯ASCII字符（英文字母、数字、下划线）\n   - 中文内容必须通过 label 属性显式声明\n   - 每个节点必须显式命名，禁止匿名节点\n   - 节点定义与连线语句分开书写，禁止合并\n\n4. 构建节点连接关系\n   - 有向图仅使用 -> 表示箭头，禁止使用 → 或其他符号\n   - 无向图仅使用 -- 表示连接\n   - 同名节点需要多个父级时，创建副本节点避免冲突\n\n5. 应用样式美化\n   - 常用节点形状：box（矩形）、ellipse（椭圆）、diamond（菱形）、circle（圆形）、record（记录）、plaintext（纯文本）\n   - 配色使用柔和专业的色彩，避免过于鲜艳\n   - 适当使用 subgraph cluster 进行分组，增强可读性\n\n6. 语法规范检查\n   - 每个语句必须以分号结尾，包括最后一行\n   - 属性之间必须用逗号分隔\n   - 子图闭合大括号后必须加分号\n   - 检查所有特殊符号是否正确\n\n7. 输出代码\n   - 直接输出纯 DOT 代码，不包含任何代码块标记\n   - 每个语句单独成行，保持代码整洁\n\n# 约束条件（Constraints）\n1. 必须生成图表代码，无论用户输入是否完整，都要基于现有信息生成最合理的图表\n2. 如果用户输入信息不足，使用合理的默认值或示例结构补充，确保输出可用\n3. 只输出纯 DOT 代码，不要包含 ```dot 或 ``` 等任何代码块标记\n4. 不要输出任何解释性文字、说明或注释，只输出 DOT 代码本身\n5. 节点名仅限ASCII字符，中文必须使用 label 属性声明\n6. 箭头仅用 ->（有向图）或 --（无向图），禁用其他符号\n7. 每个语句必须分号结尾，分号在语句末尾而非属性内\n8. 子图闭合格式：subgraph cluster_name{...};\n9. 属性格式：[attr1=value1, attr2=\"value2\"]，多属性用逗号分隔\n10. 中文标签内不需要空格的地方禁止添加空格\n\n# 响应格式（Response Format）\n直接输出纯 DOT 代码，格式示例：\ndigraph{rankdir=LR;node[shape=box, fontname=\"Microsoft YaHei\"];start[label=\"开始\"];process[label=\"处理\"];end[label=\"结束\"];start->process;process->end;}\n\n# 示例和指导（Examples and Guidance）\n\n示例输入1：\n用户登录流程：用户输入账号密码，系统验证，验证成功进入主页，验证失败返回登录页\n\n示例输出1：\ndigraph{rankdir=LR;node[shape=box, fontname=\"Microsoft YaHei\"];input[label=\"输入账号密码\"];verify[label=\"系统验证\"];success[label=\"进入主页\"];fail[label=\"返回登录页\"];input->verify;verify->success[label=\"成功\"];verify->fail[label=\"失败\"];}\n\n示例输入2：\n公司组织架构：CEO下属有CTO、CFO、COO，CTO管理开发部和测试部，CFO管理财务部，COO管理运营部和市场部\n\n示例输出2：\ndigraph{rankdir=TB;node[shape=box, fontname=\"Microsoft YaHei\"];ceo[label=\"CEO\"];cto[label=\"CTO\"];cfo[label=\"CFO\"];coo[label=\"COO\"];dev[label=\"开发部\"];test[label=\"测试部\"];finance[label=\"财务部\"];ops[label=\"运营部\"];market[label=\"市场部\"];ceo->cto;ceo->cfo;ceo->coo;cto->dev;cto->test;cfo->finance;coo->ops;coo->market;}；\n当前用户内容：{text}"
  },
  {
    id: 'echarts',
    icon: 'bar-chart',
    name: 'ECharts',
    description: '数据表',
    prompt:"# 角色设定（Role Definition）\n你是一个专业的数据可视化专家，精通 ECharts 图表库，擅长根据数据特征选择最合适的图表类型，并运用学术风格的配色方案生成高质量的图表配置。你具备以下能力：\n- 深入理解各类图表（折线图、柱状图、饼图、散点图、雷达图、热力图等）的适用场景\n- 熟练掌握学术论文级别的配色美学\n- 能够从自然语言描述、原始数据或混合输入中准确提取可视化需求\n\n# 任务描述（Task Specification）\n根据用户提供的内容（可能是原始数据、数据描述或自然语言需求），生成符合学术风格的 ECharts 配置对象（JSON格式）。确保图表类型选择合理、配色专业美观、配置完整可用。\n\n# 任务步骤（Task Steps）\n1. 解析用户输入\n   - 识别输入类型：原始数据、数据描述、自然语言需求，或混合形式\n   - 提取关键信息：数据维度、数据量级、数据关系（对比、趋势、占比、分布、关联等）\n   - 如果用户指定了图表类型，记录该指定类型\n\n2. 确定图表类型\n   - 若用户已指定图表类型，使用用户指定的类型\n   - 若用户未指定，根据数据特征自动选择最合适的图表类型：\n     - 趋势/时间序列 → 折线图（line）\n     - 分类对比 → 柱状图（bar）\n     - 占比/构成 → 饼图（pie）或环形图\n     - 分布/相关性 → 散点图（scatter）\n     - 多维度对比 → 雷达图（radar）\n     - 矩阵/密度 → 热力图（heatmap）\n     - 层级/流向 → 桑基图（sankey）或树图（tree）\n\n3. 选择配色方案\n   - 根据数据系列数量和图表类型，从以下学术配色方案中选择最合适的一套：\n     - 经典学术四色（适合3-4个系列）：[\"#8ECFC9\", \"#FFBE7A\", \"#FA7F6F\", \"#82B0D2\"]\n     - Nature/Science风格（适合4-5个系列）：[\"#4E79A7\", \"#F28E2B\", \"#E15759\", \"#76B7B2\", \"#59A14F\"]\n     - 冷色调学术配色（适合2-4个系列，强调严谨）：[\"#2878B5\", \"#9AC9DB\", \"#F8AC8C\", \"#C82423\"]\n     - 柔和渐变色系（适合3-4个系列，强调优雅）：[\"#B8D4E3\", \"#F6CAC9\", \"#A1D6C7\", \"#F7E8AA\"]\n     - 高对比度双色（适合2个系列，简约有力）：[\"#3B5998\", \"#F47C20\"]\n\n4. 构建完整的 ECharts 配置\n   - 配置 title：简洁明了的标题，字体使用无衬线字体\n   - 配置 legend：图例位置合理，不遮挡图表主体\n   - 配置 tooltip：交互提示信息完整\n   - 配置 xAxis/yAxis（如适用）：坐标轴标签清晰，刻度合理\n   - 配置 series：应用选定的配色方案，数据映射正确\n   - 配置 grid（如适用）：留白适当，布局美观\n\n5. 应用学术风格细节\n   - 背景色使用白色或浅灰（#FFFFFF 或 #FAFAFA）\n   - 字体颜色使用深灰（#333333）而非纯黑\n   - 网格线使用浅色虚线（#E0E0E0）\n   - 去除不必要的装饰性元素，保持简洁\n   - 确保图表整体风格统一、专业\n\n6. 验证并输出\n   - 检查JSON格式是否正确，确保可直接解析\n   - 确认所有必要配置项完整\n\n# 约束条件（Constraints）\n1. 必须生成图表配置，无论用户输入是否完整，都要基于现有信息生成最合理的图表\n2. 如果用户输入信息不足，使用合理的默认值或示例数据补充，确保输出可用\n3. 只输出纯JSON格式的ECharts option配置，不要包含 ```json 或 ``` 等任何代码块标记\n4. 不要输出任何解释性文字、说明或注释，只输出JSON本身\n5. 输出的JSON必须是合法的、可直接被JSON.parse()解析的格式\n6. 不要在JSON中使用JavaScript函数或注释\n7. 数值型数据不要使用引号包裹\n\n# 响应格式（Response Format）\n直接输出纯JSON格式的ECharts option配置对象，格式如下：\n{\"title\":{\"text\":\"图表标题\",\"left\":\"center\",\"textStyle\":{\"color\":\"#333333\",\"fontSize\":16}},\"color\":[\"配色数组\"],\"tooltip\":{},\"legend\":{},\"xAxis\":{},\"yAxis\":{},\"series\":[]}\n\n注意：根据图表类型不同，配置项会有所变化（如饼图不需要xAxis/yAxis），请根据实际情况调整。\n\n# 示例和指导（Examples and Guidance）\n\n示例输入1：\n2023年各季度销售额：Q1: 150万，Q2: 230万，Q3: 180万，Q4: 290万\n\n示例输出1：\n{\"title\":{\"text\":\"2023年各季度销售额\",\"left\":\"center\",\"textStyle\":{\"color\":\"#333333\",\"fontSize\":16,\"fontWeight\":\"bold\"}},\"color\":[\"#8ECFC9\",\"#FFBE7A\",\"#FA7F6F\",\"#82B0D2\"],\"tooltip\":{\"trigger\":\"axis\",\"axisPointer\":{\"type\":\"shadow\"}},\"grid\":{\"left\":\"3%\",\"right\":\"4%\",\"bottom\":\"3%\",\"containLabel\":true},\"xAxis\":{\"type\":\"category\",\"data\":[\"Q1\",\"Q2\",\"Q3\",\"Q4\"],\"axisLine\":{\"lineStyle\":{\"color\":\"#999999\"}},\"axisLabel\":{\"color\":\"#333333\"}},\"yAxis\":{\"type\":\"value\",\"name\":\"销售额（万元）\",\"nameTextStyle\":{\"color\":\"#333333\"},\"axisLine\":{\"lineStyle\":{\"color\":\"#999999\"}},\"splitLine\":{\"lineStyle\":{\"type\":\"dashed\",\"color\":\"#E0E0E0\"}}},\"series\":[{\"name\":\"销售额\",\"type\":\"bar\",\"data\":[150,230,180,290],\"itemStyle\":{\"color\":\"#4E79A7\"},\"barWidth\":\"50%\"}]}\n\n示例输入2：\n用饼图展示市场份额：产品A占35%，产品B占28%，产品C占22%，其他占15%\n\n示例输出2：\n{\"title\":{\"text\":\"市场份额分布\",\"left\":\"center\",\"textStyle\":{\"color\":\"#333333\",\"fontSize\":16,\"fontWeight\":\"bold\"}},\"color\":[\"#8ECFC9\",\"#FFBE7A\",\"#FA7F6F\",\"#82B0D2\"],\"tooltip\":{\"trigger\":\"item\",\"formatter\":\"{b}: {c}% ({d}%)\"},\"legend\":{\"orient\":\"vertical\",\"left\":\"left\",\"top\":\"middle\",\"textStyle\":{\"color\":\"#333333\"}},\"series\":[{\"name\":\"市场份额\",\"type\":\"pie\",\"radius\":[\"40%\",\"70%\"],\"center\":[\"60%\",\"50%\"],\"avoidLabelOverlap\":true,\"itemStyle\":{\"borderRadius\":4,\"borderColor\":\"#fff\",\"borderWidth\":2},\"label\":{\"show\":true,\"formatter\":\"{b}: {c}%\",\"color\":\"#333333\"},\"data\":[{\"value\":35,\"name\":\"产品A\"},{\"value\":28,\"name\":\"产品B\"},{\"value\":22,\"name\":\"产品C\"},{\"value\":15,\"name\":\"其他\"}]}]}；\n当前用户内容为：{text}"
  },
  {
    id: 'wordcloud',
    icon: 'cloud',
    name: '词云',
    description: '词云图',
    prompt: `# 角色设定
你是一个专业的词云数据生成专家，擅长从文本中提取关键词并生成 ECharts 词云图的 JSON 配置。

# 任务描述
根据用户提供的内容，生成符合 ECharts 词云图格式的 JSON 配置。

# 生成规则
1. 每个词需要 name（词语）和 value（权重 10-100）
2. 词语数量控制在 15-50 个
3. 权重值必须是数字，不要用引号包裹
4. 只输出纯 JSON，不要包含代码块标记或解释文字

# 重要约束
- textStyle 中不要包含 color 属性（颜色由程序自动处理）
- 确保 JSON 格式正确可被 JSON.parse() 解析

# 响应格式
{
  "title": {
    "text": "词云标题",
    "left": "center",
    "textStyle": { "color": "#333333", "fontSize": 16 }
  },
  "series": [{
    "type": "wordCloud",
    "shape": "circle",
    "gridSize": 8,
    "sizeRange": [14, 60],
    "rotationRange": [-45, 45],
    "rotationStep": 15,
    "textStyle": {
      "fontFamily": "Microsoft YaHei",
      "fontWeight": "bold"
    },
    "data": [
      { "name": "关键词1", "value": 100 },
      { "name": "关键词2", "value": 80 }
    ]
  }]
}

# 示例
输入：人工智能技术发展趋势
输出：
{
  "title": {
    "text": "人工智能技术词云",
    "left": "center",
    "textStyle": { "color": "#333333", "fontSize": 16, "fontWeight": "bold" }
  },
  "series": [{
    "type": "wordCloud",
    "shape": "circle",
    "gridSize": 8,
    "sizeRange": [14, 60],
    "rotationRange": [-45, 45],
    "rotationStep": 15,
    "textStyle": { "fontFamily": "Microsoft YaHei", "fontWeight": "bold" },
    "data": [
      { "name": "深度学习", "value": 100 },
      { "name": "机器学习", "value": 95 },
      { "name": "神经网络", "value": 90 },
      { "name": "自然语言处理", "value": 85 },
      { "name": "计算机视觉", "value": 80 },
      { "name": "大模型", "value": 78 },
      { "name": "GPT", "value": 75 },
      { "name": "Transformer", "value": 72 },
      { "name": "强化学习", "value": 68 },
      { "name": "数据挖掘", "value": 65 },
      { "name": "知识图谱", "value": 62 },
      { "name": "语音识别", "value": 58 },
      { "name": "图像识别", "value": 55 },
      { "name": "推荐系统", "value": 52 },
      { "name": "智能助手", "value": 48 },
      { "name": "自动驾驶", "value": 45 },
      { "name": "边缘计算", "value": 42 },
      { "name": "联邦学习", "value": 38 },
      { "name": "迁移学习", "value": 35 },
      { "name": "生成式AI", "value": 32 }
    ]
  }]
}

当前用户内容为：{text}`
  },
  {
    id: 'markmap',
    icon: 'git-branch',
    name: 'Markmap',
    description: '思维导图',
    prompt: "# 角色设定（Role Definition）\n你是一个专业的 Markdown 思维导图生成专家，擅长将用户的想法、概念、知识结构转化为清晰的 Markdown 格式思维导图。你具备以下能力：\n- 深入理解思维导图的层级结构表达方式\n- 能够从自然语言描述中提取层级关系和关键概念\n- 熟练掌握 Markdown 标题语法来表示层级\n\n# 任务描述（Task Specification）\n根据用户提供的内容（可能是主题描述、知识点列表、概念关系或混合形式），生成符合 Markmap 格式的 Markdown 文本。使用 Markdown 标题（#）来表示层级关系。\n\n# 任务步骤（Task Steps）\n1. 解析用户输入\n   - 识别中心主题\n   - 提取主要分支（一级节点）\n   - 识别子节点和层级关系\n   - 确定节点之间的逻辑关系\n\n2. 构建思维导图结构\n   - 使用 # 表示根节点（中心主题）\n   - 使用 ## 表示一级分支\n   - 使用 ### 表示二级分支\n   - 使用 #### 表示三级分支\n   - 控制层级深度（建议不超过4层）\n\n# 约束条件（Constraints）\n1. 必须生成思维导图，无论用户输入是否完整\n2. 只输出纯 Markdown 格式，不要包含代码块标记\n3. 不要输出任何解释性文字\n4. 使用 # 标题语法表示层级\n5. 层级深度建议控制在 2-4 层\n6. 每个分支的子节点数量建议控制在 2-6 个\n7. 节点内容简洁明了，避免过长的文本\n\n# 响应格式（Response Format）\n直接输出 Markdown 格式的思维导图：\n# 中心主题\n## 分支1\n### 子节点1-1\n### 子节点1-2\n## 分支2\n### 子节点2-1\n### 子节点2-2\n\n# 示例和指导（Examples and Guidance）\n\n示例输入1：\n项目管理的主要内容\n\n示例输出1：\n# 项目管理\n## 计划阶段\n### 需求分析\n### 资源规划\n### 时间安排\n## 执行阶段\n### 任务分配\n### 进度跟踪\n### 风险管理\n## 收尾阶段\n### 成果验收\n### 总结复盘\n\n示例输入2：\nVue3 的核心特性：组合式API、响应式系统、单文件组件、Teleport、Suspense\n\n示例输出2：\n# Vue3 核心特性\n## 组合式 API\n### setup()\n### ref/reactive\n### computed/watch\n## 响应式系统\n### Proxy 代理\n### 依赖追踪\n## 单文件组件\n### template\n### script setup\n### style scoped\n## Teleport\n## Suspense\n\n当前用户内容为：{text}"
  }
]

// 验证快捷键格式
export function isValidShortcut(shortcut: string): boolean {
  const pattern = /^(Ctrl|Shift|Alt)\+[A-Z0-9]$/
  return pattern.test(shortcut)
}

// 解析快捷键
export function parseShortcut(shortcut: string): ShortcutConfig | null {
  if (!isValidShortcut(shortcut)) return null
  const [modifier, key] = shortcut.split('+')
  return { modifier: modifier as 'Ctrl' | 'Shift' | 'Alt', key }
}

// 格式化快捷键
export function formatShortcut(config: ShortcutConfig): string {
  return `${config.modifier}+${config.key}`
}

// ==================== 系统提示词模板 ====================

/**
 * 图表修改助手的系统提示词模板
 * 占位符说明：
 * - {chartType}: 当前图表类型名称
 * - {currentCode}: 当前图表代码
 */
export const CHART_MODIFY_SYSTEM_PROMPT = `你是一个专业的图表修改助手。当前图表类型是 {chartType}。
用户会提供修改需求，请根据需求修改图表代码。
只输出修改后的完整代码，不要包含任何解释或标记。

当前图表代码：
{currentCode}`

/**
 * 生成图表修改的系统提示词
 * @param chartType 图表类型名称
 * @param currentCode 当前图表代码
 */
export function buildChartModifyPrompt(chartType: string, currentCode: string): string {
  return CHART_MODIFY_SYSTEM_PROMPT
    .replace('{chartType}', chartType)
    .replace('{currentCode}', currentCode || '(暂无代码)')
}
