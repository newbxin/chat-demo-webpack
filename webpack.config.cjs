const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const { setupMockServer } = require('./src/core/mock/mock-server.cjs');

const transpileModulePrefixes = [
  '@floating-ui',
  '@langchain',
  '@radix-ui',
  '@tanstack',
  '@xyflow',
  'ai',
  'ansi-styles',
  'canvas-confetti',
  'cmdk',
  'date-fns',
  'embla-carousel',
  'gsap',
  'lucide-react',
  'motion',
  'next-themes',
  'nanoid',
  'p-retry',
  'rehype-',
  'remark-',
  'react-resizable-panels',
  'shiki',
  'sonner',
  'streamdown',
  'tailwind-merge',
  'tokenlens',
  'unist-util-',
  'use-stick-to-bottom',
  'class-variance-authority',
  'clsx',
  'best-effort-json-parser',
];

const shouldTranspileDependency = (filePath) =>
  transpileModulePrefixes.some((moduleName) =>
    filePath.includes(`${path.sep}node_modules${path.sep}${moduleName}`));

const shikiModulePattern = new RegExp(
  `[\\\\/]node_modules[\\\\/](shiki|@shikijs)[\\\\/]`,
);

const createBabelOptions = (isProduction) => ({
  babelrc: false, // 不要读取项目里的 .babelrc
  configFile: false, // 不要读取项目里的 babel.config.js
  presets: [
    // 语法转换成目标环境更能兼容的写法
    ['@babel/preset-env', {
      bugfixes: true, // 启用一些更细粒度的兼容修复
      modules: false, // 不要把 ES Module 强行转成 CommonJS，方便 webpack 自己做 tree-shaking 和打包优化
      loose: false, // 使用更规范、更接近标准语义的转换结果
    }],
    ['@babel/preset-react', { runtime: 'automatic' }], // 使用新版 JSX 转换，不需要每个文件手动 import React，作用同tsconfig的"jsx": "react-jsx",
    '@babel/preset-typescript', // 让 Babel 能识别并移除 TypeScript 类型语法
  ],
  sourceType: 'unambiguous',  // 自动识别模块类型，兼容不同来源文件
  cacheDirectory: true, // 缓存babel编译结果，加速 Babel 重编译
  compact: isProduction,  // 压缩代码，生产环境输出更紧凑
});

module.exports = (_, argv = {}) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/main.tsx',
    target: ['web', 'es5'],
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].chunk.js',
      publicPath: '/',
      assetModuleFilename: 'assets/[name].[hash][ext]',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx|mjs)$/,
          exclude: (filePath) => /node_modules/.test(filePath) && !shouldTranspileDependency(filePath),
          use: {
            loader: 'babel-loader',
            options: createBabelOptions(isProduction),
          },
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: true,
      }),
      new CleanWebpackPlugin(),
      new ProgressBarPlugin(),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      port: 8000,
      hot: true,
      open: false,
      historyApiFallback: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      setupMiddlewares(middlewares, devServer) {
        setupMockServer(devServer.app);
        return middlewares;
      },
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          shiki: {
            test: (module) => shikiModulePattern.test(module.resource || ''),
            name: 'shiki',
            chunks: 'async',
            enforce: true,
            priority: 20,
          },
          vendor: {
            test: (module) => {
              const resource = module.resource || '';
              return /[\\/]node_modules[\\/]/.test(resource) && !shikiModulePattern.test(resource);
            },
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
  };
};
