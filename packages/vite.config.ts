import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'
import { resolve } from 'path'

const useDevMode = true // 如果是在主应用中加载子应用vite,必须打开这个,否则vite加载不成功, 单独运行没影响

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname)
  const subAppName = env.VITE_SUB_APP_NAME
  const activeRule = env.VITE_ACTIVE_RULE || `/${subAppName}`
  const apiBase = env.VITE_API_BASE_URL || '/api'
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000'
  const isProd = mode === 'production'

  // 判断是否独立部署
  const isStandalone = env.VITE_STANDALONE_DEPLOY === 'true'

  // 独立部署时使用根路径 '/'，集成到主应用时使用子应用路径
  // 移除 activeRule 开头的斜杠，避免出现双斜杠
  const cleanActiveRule = (activeRule || '').replace(/^\//, '').replace(/^subApp\//, '')
  const base = isProd && !isStandalone ? `/${cleanActiveRule}/` : '/';

  return {
    base: base,
    plugins: [
      vue(),
      qiankun(subAppName, {
        useDevMode
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@api': resolve(__dirname, 'src/api'),
        '@components': resolve(__dirname, 'src/components'),
        '@views': resolve(__dirname, 'src/views'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@types': resolve(__dirname, 'src/types'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@store': resolve(__dirname, 'src/store'),
        '@styles': resolve(__dirname, 'src/styles'),
      },
      // 本地 link 组件库时统一使用微应用的单例依赖，避免主题和上下文失效
      dedupe: ['vue', 'ant-design-vue', '@ant-design/icons-vue', '@formily/core', '@formily/vue']
    },
    css: {
      preprocessorOptions: {
        less: {
          additionalData: `@import "@/styles/variables.less";`,
          javascriptEnabled: true,
        }
      }
    },
    server: {
      port: 8084,
      host: '0.0.0.0',
      cors: true,
      origin: 'http://localhost:8084',
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      // 显式钉死项目根。默认识别会走到 ~/pnpm-workspace.yaml，把整个 $HOME 当作 workspace。
      fs: {
        allow: [__dirname]
      },
      watch: {
        followSymlinks: false,
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
      },
      proxy: {
        [apiBase]: {
          target: proxyTarget,
          changeOrigin: true,
          // rewrite: (path) => path.replace(new RegExp(`^${apiBase}`), '')
        }
      }
    },
    // 依赖预构建：只从 HTML 入口扫描。
    // force:true 会在每次 pnpm dev 全量重打包；把整个 src 当 entries 会扫到 400+ 生成文件并把 monaco 拉进预构建，表现为启动卡死。
    optimizeDeps: {
      entries: ['index.html'],
      include: ['axios', 'ant-design-vue', '@yss-ui/components'],
      needsInterop: ['xe-utils'],
      exclude: ['monaco-editor', 'monaco-editor-nls'],
    },
    build: {
      target: 'es2020',
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          manualChunks: undefined // 直接去掉自定义分包
          // 如果你坚持自定义，至少这样合并（不要单拆 icons）：
          // manualChunks(id) {
          //   if (id.includes('ant-design-vue') || id.includes('@ant-design/icons-vue')) return 'antdv'
          //   if (id.includes('vue-router')) return 'vue-router'
          //   if (id.includes('pinia')) return 'pinia'
          //   if (id.includes('/vue/')) return 'vue'
          // }
        }
      }
    }
  }
})
