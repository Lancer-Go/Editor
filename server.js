const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3456;

// 解析 JSON 请求体 (最大 50MB，因为 HTML 原型可能很大)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== 编辑器前端页面 =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// ===== API: 列出目录下的 HTML 文件 =====
app.get('/api/files', (req, res) => {
  const dir = req.query.dir;
  if (!dir) {
    return res.status(400).json({ error: '请提供目录路径参数 dir' });
  }

  const targetDir = path.resolve(dir);

  if (!fs.existsSync(targetDir)) {
    return res.status(404).json({ error: '目录不存在: ' + targetDir });
  }

  try {
    const items = [];
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // 跳过隐藏目录和 node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        items.push({
          name: entry.name,
          type: 'directory',
          path: path.join(targetDir, entry.name)
        });
      } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
        items.push({
          name: entry.name,
          type: 'file',
          path: path.join(targetDir, entry.name)
        });
      }
    }

    // 目录在前，文件在后
    items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });

    res.json({ dir: targetDir, items });
  } catch (err) {
    res.status(500).json({ error: '读取目录失败: ' + err.message });
  }
});

// ===== API: 读取 HTML 文件内容 =====
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: '请提供文件路径参数 path' });
  }

  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: '文件不存在: ' + resolved });
  }

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    res.json({ path: resolved, content });
  } catch (err) {
    res.status(500).json({ error: '读取文件失败: ' + err.message });
  }
});

// ===== API: 保存 HTML 文件 =====
app.post('/api/save', (req, res) => {
  const { filePath, content } = req.body;

  if (!filePath || content === undefined) {
    return res.status(400).json({ error: '请提供 filePath 和 content' });
  }

  const resolved = path.resolve(filePath);

  try {
    // 先备份原文件
    const backupPath = resolved + '.backup';
    if (fs.existsSync(resolved)) {
      fs.copyFileSync(resolved, backupPath);
    }

    fs.writeFileSync(resolved, content, 'utf-8');
    res.json({ success: true, path: resolved, backupPath });
  } catch (err) {
    res.status(500).json({ error: '保存失败: ' + err.message });
  }
});

// ===== 静态文件代理：预览原型所需的资源文件 =====
app.get('/preview', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: '请提供文件路径参数 path' });
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return res.status(404).send('文件不存在');
  }

  // 读取 HTML 内容
  let content = fs.readFileSync(resolved, 'utf-8');

  // 注入 <base> 标签，让相对路径的资源能正确加载
  const baseDir = path.dirname(resolved).replace(/\\/g, '/');
  const baseTag = `<base href="/static/?base=${encodeURIComponent(baseDir)}/">`;

  if (content.includes('<head>')) {
    content = content.replace('<head>', `<head>\n${baseTag}`);
  } else if (content.includes('<html>') || content.includes('<html ')) {
    content = content.replace(/<html[^>]*>/, `$&\n<head>${baseTag}</head>`);
  } else {
    content = `<head>${baseTag}</head>\n` + content;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(content);
});

// ===== 静态资源代理：让原型引用的 CSS/JS/图片 能正确加载 =====
app.get('/static/', (req, res) => {
  const base = req.query.base;
  // 获取请求路径（去掉 /static/ 前缀和 query）
  const requestUrl = req.originalUrl;
  const staticPrefix = '/static/';
  let relativePath = requestUrl.substring(requestUrl.indexOf(staticPrefix) + staticPrefix.length);

  // 去掉 query string
  const queryIdx = relativePath.indexOf('?');
  if (queryIdx > 0) {
    relativePath = relativePath.substring(0, queryIdx);
  }

  if (!base) {
    return res.status(400).send('缺少 base 参数');
  }

  const filePath = path.join(base, decodeURIComponent(relativePath));

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('资源不存在: ' + filePath);
  }

  res.sendFile(filePath);
});

// ===== 启动服务器 =====
app.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   🎨 HTML 原型可视化编辑工具 已启动!     ║');
  console.log(`  ║   地址: ${url}                  ║`);
  console.log('  ║   按 Ctrl+C 停止服务                     ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');

  // 自动打开浏览器
  try {
    const open = (await import('open')).default;
    await open(url);
  } catch (e) {
    console.log('  请手动打开浏览器访问: ' + url);
  }
});
