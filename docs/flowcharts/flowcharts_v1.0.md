# HTML 原型编辑器 — 核心流程图

> 📅 版本: v1.0 | 更新日期: 2026-03-30

---

## 1. 总体操作主线流程

```mermaid
flowchart TD
    A["启动编辑器<br>双击 start.bat"] --> B["浏览器自动打开<br>localhost:3456"]
    B --> C{"首次使用?"}
    C -- 是 --> D["显示空状态引导<br>输入目录路径"]
    C -- 否 --> E["自动恢复上次目录<br>localStorage"]
    D --> F["输入/拖入项目文件夹路径"]
    E --> F
    F --> G["API: /api/files<br>列出 HTML 文件"]
    G --> H{"目录有 HTML 文件?"}
    H -- 否 --> I["显示空目录提示<br>保留返回上级按钮"]
    H -- 是 --> J["渲染项目文件树"]
    I --> F
    J --> K["点击 HTML 文件"]
    K --> L["API: /api/file<br>读取文件内容"]
    L --> M["iframe 加载预览<br>注入 base 标签"]
    M --> N["进入编辑循环"]

    N --> O{"用户操作"}
    O -- 点击元素 --> P["选中高亮 + 右侧属性面板"]
    O -- 双击元素 --> Q["进入行内文字编辑"]
    O -- 拖入组件 --> R["从组件面板插入新元素"]
    O -- 拖动元素 --> S["自由移动 + 智能对齐"]
    O -- 删除元素 --> T["Delete 键移除"]
    O -- Ctrl+S --> U["保存文件"]

    P --> N
    Q --> N
    R --> N
    S --> N
    T --> N
    U --> V["API: /api/save<br>备份原文件 + 写入新内容"]
    V --> N

    style A fill:#6c5ce7,color:#fff
    style N fill:#00b894,color:#fff
    style R fill:#e17055,color:#fff
    style S fill:#e17055,color:#fff
```

---

## 2. 组件拖拽添加流程 (P1 核心)

```mermaid
flowchart TD
    A["用户点击左侧<br>组件 Tab"] --> B["展示组件分类面板<br>基础/表单/按钮/容器/导航/反馈"]
    B --> C["用户搜索或浏览<br>找到目标组件"]
    C --> D["鼠标按住组件缩略图<br>触发 dragstart"]
    D --> E{"画布中是否<br>已打开 HTML 文件?"}
    E -- 否 --> F["Toast: 请先打开一个 HTML 文件<br>取消拖拽"]
    E -- 是 --> G["显示拖拽幽灵预览<br>跟随鼠标移动"]
    G --> H["鼠标移入 iframe 画布区域"]
    H --> I["实时计算插入位置<br>显示蓝色插入指示线"]
    I --> J{"鼠标释放<br>位置合法?"}
    J -- 画布外 --> K["取消操作<br>无副作用"]
    J -- 画布内有效位置 --> L["创建组件 HTML 片段"]
    L --> M["插入到 iframe DOM<br>目标位置"]
    M --> N["自动选中新元素<br>右侧显示属性"]
    N --> O["pushUndo<br>记录到撤销栈"]
    O --> P["markDirty<br>标记未保存"]

    style D fill:#6c5ce7,color:#fff
    style L fill:#00b894,color:#fff
    style F fill:#e17055,color:#fff
```

---

## 3. 智能对齐辅助线流程 (P1 核心)

```mermaid
flowchart TD
    A["选中元素后<br>mousedown 开始拖动"] --> B["记录起始位置<br>origLeft, origTop"]
    B --> C["mousemove 事件触发"]
    C --> D["计算拖拽元素的<br>四条边+两条中心线"]
    D --> E["遍历画布中所有<br>同层级可见元素"]
    E --> F["逐一计算目标元素的<br>六条参考线"]
    F --> G{"任意线距 ≤ 5px ?"}
    G -- 是 --> H["显示红色辅助线<br>吸附到精确位置"]
    G -- 否 --> I["隐藏所有辅助线<br>自由移动"]
    H --> J["继续 mousemove"]
    I --> J
    J --> C

    C --> K{"mouseup ?"}
    K -- 是 --> L["隐藏所有辅助线"]
    L --> M["pushUndo<br>记录位置变化"]
    M --> N["更新属性面板<br>X/Y 坐标"]

    style A fill:#6c5ce7,color:#fff
    style H fill:#e17055,color:#fff
    style L fill:#00b894,color:#fff
```

---

## 4. 文件打开与项目管理流程

```mermaid
flowchart TD
    A["用户操作"] --> B{"操作类型"}
    B -- 输入路径+回车 --> C["loadDirectory API"]
    B -- 拖拽文件夹到窗口 --> D["读取 DataTransfer<br>提取路径"]
    B -- 点击最近文件 --> E["直接 openFile"]
    B -- 自动恢复 --> F["从 localStorage<br>读取上次路径"]

    D --> C
    F --> C

    C --> G{"API 返回"}
    G -- 成功 --> H["渲染文件树<br>存储到 localStorage"]
    G -- 目录不存在 --> I["Toast 错误提示"]
    G -- 空目录 --> J["显示空提示<br>保留返回上级"]

    H --> K["用户点击文件"]
    K --> L{"当前文件未保存?"}
    L -- 是 --> M["确认框: 是否放弃修改?"]
    M -- 取消 --> K
    M -- 确定 --> N["openFile"]
    L -- 否 --> N
    E --> N

    N --> O["API 读取文件内容"]
    O --> P["iframe 加载预览"]
    P --> Q["注入编辑器交互脚本"]
    Q --> R["清空撤销栈<br>标记为已保存"]

    style A fill:#6c5ce7,color:#fff
    style J fill:#fdcb6e,color:#333
    style I fill:#e17055,color:#fff
```

---

## 5. 保存与备份流程

```mermaid
flowchart TD
    A["用户触发保存<br>Ctrl+S 或点击按钮"] --> B["getIframeHTML<br>提取干净的 HTML"]
    B --> C["移除编辑器注入<br>style / class / base"]
    C --> D["POST /api/save<br>发送 filePath + content"]
    D --> E{"服务器处理"}
    E --> F["复制原文件为 .backup"]
    F --> G["写入新内容"]
    G --> H{"写入成功?"}
    H -- 是 --> I["返回 success<br>Toast 保存成功"]
    H -- 否 --> J["返回 error<br>Toast 保存失败"]
    I --> K["isDirty = false"]
    J --> L["保留编辑内容不丢失"]

    style A fill:#6c5ce7,color:#fff
    style I fill:#00b894,color:#fff
    style J fill:#e17055,color:#fff
```

---

## 6. 批量导出流程 (P4)

```mermaid
flowchart TD
    A["点击工具栏 导出 按钮"] --> B["弹出导出配置面板"]
    B --> C{"导出范围"}
    C -- 当前页 --> D["选择当前打开的页面"]
    C -- 批量 --> E["勾选项目中的多个 HTML"]
    D --> F{"导出格式"}
    E --> F
    F -- PNG --> G["Puppeteer 逐页截图"]
    F -- PDF --> H["Puppeteer 逐页生成 PDF"]
    G --> I["打包下载 / 保存到 exports 目录"]
    H --> I
    I --> J["Toast: 导出完成"]

    style A fill:#6c5ce7,color:#fff
    style J fill:#00b894,color:#fff
```

---

## 7. 源码编辑模式切换流程 (P5)

```mermaid
flowchart TD
    A["点击工具栏 源码 按钮"] --> B{"当前模式?"}
    B -- 可视化模式 --> C["获取 iframe 当前 HTML"]
    C --> D["画布区切换为<br>代码编辑器视图"]
    D --> E["加载代码到编辑器<br>语法高亮渲染"]
    E --> F["用户在源码中修改"]
    F --> G["实时解析 HTML<br>同步到 iframe 预览"]

    B -- 源码模式 --> H["读取编辑器中的代码"]
    H --> I["写回 iframe<br>重新加载预览"]
    I --> J["切换回可视化模式"]
    J --> K["重新注入编辑器交互"]

    style A fill:#6c5ce7,color:#fff
    style D fill:#fdcb6e,color:#333
    style J fill:#00b894,color:#fff
```
