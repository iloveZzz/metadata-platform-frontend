module.exports = {
  // 忽略自动生成目录中的所有文件
  ignore: ['packages/src/api/generated/**'],
  // Vue 文件处理
  '*.vue': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // TypeScript 文件处理
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write', 
  ],
  
  // 样式文件处理
  '*.{css,less,scss,sass}': [
    'prettier --write',
  ],
  
  // JSON 文件处理
  '*.{json,jsonc}': [
    'prettier --write',
  ],
  
  // Markdown 文件处理
  '*.md': [
    'prettier --write',
  ],
  
  // YAML 文件处理
  '*.{yml,yaml}': [
    'prettier --write',
  ],
};