# 项目改造计划：Vite → Webpack

## Context

当前项目使用 Vite 5 作为构建工具，需迁移到 Webpack 5。Vite 的优势在于快速的开发服务器和 HMR，而 webpack 提供更强大的打包能力和广泛的生态。

## 改造范围

### 1. 安装 webpack 及相关依赖

```bash
# 核心
webpack webpack-cli webpack-dev-server

# 处理 JSX/TSX
babel-loader @babel/core @babel/preset-react @babel/preset-typescript

# 处理 CSS
css-loader style-loader postcss-loader

# 处理 HTML
html-webpack-plugin

# 处理图片/字体等资源
asset-resource

# 处理 node_modules
node-loader

# 清理构建目录
clean-webpack-plugin

# 进度条
progress-bar-webpack-plugin

# 处理 .mjs
babel-loader (已有)
```

### 2. 创建 webpack 配置

新建 `webpack.config.ts`，核心配置：
- `entry`: `./src/main.tsx`
- `output`: 输出到 `dist/`
- `resolve.extensions`: `[".ts", ".tsx", ".js", ".jsx", ".mjs"]`
- `resolve.alias`: `@` → `./src`
- `module.rules`:
  - `*.{ts,tsx}`: `babel-loader` (预设 `@babel/preset-react`, `@babel/preset-typescript`)
  - `*.css`: `css-loader` + `style-loader` + `postcss-loader`
  - assets: `asset/resource`
- `plugins`: `HtmlWebpackPlugin`, `CleanWebpackPlugin`
- `devServer`: 端口 8000，开启 HMR（可选）
- `optimization.splitChunks`: 拆分 vendor chunk
- `devtool`: `source-map`（开发）

### 3. 更新 babel 配置

新建 `babel.config.js` 或在 webpack 中内联 babel 配置：
```javascript
{
  presets: [
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript"
  ]
}
```

### 4. 迁移 PostCSS 配置

`postcss.config.js` 保持不变（tailwindcss + autoprefixer），但 postcss-loader 需要在 webpack 中配置。

### 5. 更新 package.json scripts

将：
```json
"dev": "vite",
"build": "tsc && vite build",
"preview": "vite preview"
```

改为：
```json
"dev": "webpack serve --mode development",
"build": "webpack --mode production",
"typecheck": "tsc --noEmit"
```

注意：类型检查与打包分离，webpack build 不再做 tsc 检查。

### 6. 处理 Vite 特有配置

- 删除 `vite.config.ts`
- 删除 `@vitejs/plugin-react`
- `index.html` 中 `<script type="module" src="/src/main.tsx">` 改为由 `html-webpack-plugin` 自动注入

### 7. 可选：tsconfig.json 路径别名兼容

webpack 的 alias 需要与 tsconfig.json 的 paths 保持一致（已确认当前已配置 `@/*`）。

## 关键文件变更

| 操作 | 文件 |
|------|------|
| 新建 | `webpack.config.ts` |
| 新建 | `babel.config.js` |
| 删除 | `vite.config.ts` |
| 修改 | `package.json` (移除 vite, @vitejs/plugin-react, 添加 webpack 等) |

## 验证方案

1. `npm run typecheck` - 确保 TypeScript 类型正确
2. `npm run dev` - 启动 webpack dev server，访问 localhost:8000
3. `npm run build` - 确认构建产物正常生成
4. 浏览器验证：页面正常渲染，样式正确，HMR 生效

## 风险点

### 1. Tailwind CSS 4 与 webpack 的兼容性问题

当前项目使用 Tailwind CSS 4.x，它默认使用 Vite 的内置 CSS 处理方式。在 webpack 环境下：
- `@tailwindcss/postcss` 插件需要正确配置 postcss-loader
- 如果出现样式丢失或构建警告，可能需要调整 `postcss.config.js`
- Tailwind 4 的 CSS 变量主题（`theme({ --color-* })`）在 webpack 的 css-loader 中可能需要额外处理
- 验证方法：启动后检查暗黑模式、主题色、响应式布局是否正常

### 2. HMR（热模块替换）配置复杂度

Vite 原生支持 HMR，webpack 需要额外配置：
- 需要安装 `react-refresh-webpack-plugin` 和 `react-refresh`
- 如果 HMR 不工作，修改代码后页面会整体刷新，影响开发体验
- 配置位置：`webpack.config.ts` 的 `plugins` 和 `devServer`

### 3. 依赖中的 ESM (ES Modules) 问题

项目依赖中有一些是纯 ESM 格式（如 `streamdown`, `tokenlens`, 部分 `ai` 包）：
- webpack 5 默认尝试处理 ESM，但某些包可能需要 `experiments.outputModule: true`
- 某些 node_modules 可能触发 `require() of ES Module` 错误，需要在 `resolve.mainFields` 或 `resolve.alias` 中处理
- 常见报错：`Error: require() of ES Module ... not supported`

### 4. 构建产物差异导致的运行时问题

- Vite 使用 esbuild 压缩，webpack 默认使用 Terser（可改用 esbuild-loader 提升速度）
- 代码分割策略不同可能导致 chunk 加载顺序问题
- 如果当前使用了动态 import 懒加载组件，需要确认 webpack 的 `splitChunks` 配置不会把这些 chunk 错误打包

### 5. path alias `@/` 的运行时解析

- webpack 的 `resolve.alias` 只能让打包时识别 `@/`，但运行时（浏览器）不识别
- 不影响构建，因为 alias 只在打包时解析源码路径
- 如果项目中有运行时动态拼接路径的代码（如 `\`@/${variable}\``），可能需要修改

### 6. streamdown 等 native/near-native 包的二进制模块

`streamdown` 可能包含二进制 binding，在 webpack 打包时：
- 需要配置 `externals` 将其排除，不打入 bundle
- 或者使用 `node-loader` 处理 `.node` 文件
- 验证：运行时报 `Cannot find module 'streamdown'` 或类似错误时需要处理

### 7. Shiki 语法高亮的 Worker 配置

Shiki 在运行时可能启动 Web Worker：
- webpack 需要正确配置 `worker-loader` 或 `asset/source` 让 worker 文件正确加载
- 如果高亮不工作，控制台可能出现 Worker 加载失败

### 8. 生产构建优化差异

- Vite 默认 tree-shaking 较激进，webpack 需要手动配置 `optimization.usedExports` 等
- 如果最终包体积明显增大，可以后续添加 `esbuild-loader` 或 `swc-loader` 替换 `babel-loader`

## 应对策略

| 风险 | 应对 |
|------|------|
| Tailwind CSS 4 | 先按原样配置 postcss-loader，如有问题再调整 |
| HMR | 先不加 HMR，用 `webpack-dev-server --hot` 或 `react-refresh-webpack-plugin` |
| ESM 依赖 | 先构建，遇到 `require() of ES Module` 再针对性处理 `resolve.mainFields` |
| streamdown | 先配置 `externals: ['streamdown']` 排除 |
| Shiki Worker | 先构建测试，如有问题再配置 worker 处理 |
