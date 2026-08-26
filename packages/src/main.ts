import { createApp } from 'vue';
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'; // Hash 模式用于 JSP,History 模式用于 qiankun
import { createPinia } from 'pinia';
import Antd, { Radio } from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import '@/styles/index.less';

// 同步加载 JSP 主题样式（确保在 ConfigProvider 初始化前加载）
// 使用 Vite 的条件编译，由 Vite 在构建时确定导入
const jspTheme = import.meta.env.VITE_JSP_THEME;
if (jspTheme === 'guangda') {
  import('./styles/themes/guangda.less');
  console.log('[主题系统] 加载光大主题样式');
} else if (jspTheme === 'renbao') {
  import('./styles/themes/renbao.less');
  console.log('[主题系统] 加载人保主题样式');
}
import '@yss-ui/components/dist/style.css';
import YSSUI from '@yss-ui/components';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App.vue';
import { useThemeStore } from './store/theme';
import routes from './router/index.js';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
// import { setupIconfont } from './plugins/iconfont';
import { createStyleManager } from './utils/styleManager';
import { resolveMicroAppFullPath, setupMicroAppRouterBridge } from './utils/microAppRouterBridge';
import type { MicroAppLifecycleProps } from './types/microAppBridge';

dayjs.locale('zh-cn');

// 子应用名称
const SUB_APP_NAME = import.meta.env.VITE_SUB_APP_NAME;

// 创建样式管理器（自动注册事件监听）
const styleManager = createStyleManager(SUB_APP_NAME);

let app: any;
let router: any;
let history: any;
let routerBridgeCleanup: (() => void) | undefined;
let currentActiveRule = import.meta.env.VITE_ACTIVE_RULE || `/${SUB_APP_NAME}`;

/**
 * 获取当前挂载使用的路由前缀，优先采用门户下发的契约值。
 * @param props 微应用生命周期 Props
 * @returns 当前微应用路由前缀
 */
function resolveActiveRule(props: MicroAppLifecycleProps): string {
  return props.routerBase || import.meta.env.VITE_ACTIVE_RULE || `/${SUB_APP_NAME}`;
}

/**
 * 渲染微应用。
 * @param props 微应用生命周期 Props
 */
function render(props: MicroAppLifecycleProps = {}) {
  const subAppName = import.meta.env.VITE_SUB_APP_NAME;
  const activeRule = resolveActiveRule(props);
  currentActiveRule = activeRule;
  const { container } = props;

  // 判断运行环境：
  // 1. qiankun环境（被主应用加载）
  // 2. JSP环境（打包后嵌入JSP页面）
  // 3. 本地开发环境（独立运行）
  const isJSP = import.meta.env.VITE_IS_JSP === 'true';
  const isInQiankun = qiankunWindow.__POWERED_BY_QIANKUN__;

  if (isInQiankun) {
    // qiankun 环境：使用 History 模式，带子应用路径前缀
    const normalizeBase = (v: string) => (v.endsWith('/') ? v : `${v}/`);
    const base = normalizeBase(activeRule);
    history = createWebHistory(base);
  } else if (isJSP) {
    // JSP 打包环境：使用 Hash 模式
    history = createWebHashHistory();
  } else {
    // 本地开发环境：使用 History 模式，根路径
    history = createWebHistory('/');
  }

  router = createRouter({
    history,
    routes,
  });

  /**
   * 初始导航矫正守卫（仅 qiankun 环境生效）
   *
   * 问题：子应用在 qiankun 环境首次挂载时，Vue Router 的初始路由解析可能因
   * 时序问题无法正确匹配浏览器 URL 对应的子路径，导致 catch-all 路由触发并
   * 重定向到默认工作台页面。
   *
   * 原理：beforeEach 在 Vue Router 调用 history.replaceState 之前执行，
   * 此时 window.location.pathname 仍然是主应用导航设置的正确 URL。
   * 守卫从中提取子应用子路径，与 Vue Router 解析的目标路径对比，
   * 若不一致则覆盖为正确路径。
   */
  if (isInQiankun) {
    let isFirstNavigation = true;
    router.beforeEach((to: any) => {
      if (!isFirstNavigation) return true;
      isFirstNavigation = false;

      const expectedFullPath = resolveMicroAppFullPath(activeRule, window.location);

      if (expectedFullPath && expectedFullPath !== '/' && to.fullPath !== expectedFullPath) {
        return expectedFullPath;
      }

      return true;
    });
  }

  app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.use(Antd);
  // Ant Design Vue 内部 Radio.Group 默认注册为 RadioGroup，补充注册 ARadioGroup 别名以支持 <a-radio-group>
  if (!app.component('ARadioGroup')) {
    app.component('ARadioGroup', Radio.Group);
  }
  app.__yss_vxe_ui_installed__ = true;
  app.use(YSSUI);

  // 初始化主题（来自主应用的 props.themeConfig）
  const themeStore = useThemeStore();
  themeStore.init(props.themeConfig);

  const containerEl = container ? container.querySelector('#app') || container.querySelector(`#${subAppName}`) : '#app';

  // 注册 Iconfont（CDN + 本地回退） 用法：在页面直接使用 YIcon 组件 <YIcon type="iconI1093-nianjinzuhe" />
  // setupIconfont(app, {
  //   scriptUrls: [
  //     'https://at.alicdn.com/t/c/font_3948833_yhvtfgdjw7.js',
  //     'https://at.alicdn.com/t/c/font_1854291_cbm1e4kr0jf.js',
  //     '/iconfont/local-iconfont.js',
  //   ],
  //   extraCommonProps: { style: { fontSize: '16px', marginRight: '0' } },
  // });
  app.mount(containerEl);

  // 从 JSP 传递的初始路由跳转
  if (!isInQiankun && (window as any).initialRoute && router) {
    router.push((window as any).initialRoute);
  }
}

renderWithQiankun({
  mount(props) {
    // 先执行 render，确保 Vite 样式注入完成
    render(props as MicroAppLifecycleProps);

    // render 完成后再记录和启用样式
    // 使用 setTimeout 确保样式已经注入到 DOM
    setTimeout(() => {
      styleManager.recordStyles();
      styleManager.enableStyles();
    }, 100);
    routerBridgeCleanup?.();
    routerBridgeCleanup = setupMicroAppRouterBridge({
      router,
      appName: import.meta.env.VITE_SUB_APP_NAME,
      activeRule: currentActiveRule,
    });
  },
  bootstrap() {},
  unmount() {
    // 清理路由、浏览器历史和 Vite 预加载错误监听
    routerBridgeCleanup?.();
    routerBridgeCleanup = undefined;

    // 卸载时：禁用 Vite 注入的样式，避免污染其他子应用
    styleManager.disableStyles();

    app?.unmount();
    app = null;
    router = null;
    history?.destroy?.();
  },
  update(props) {
    // 主应用主题更新时，同步到子应用
    const themeStore = useThemeStore();
    themeStore.applyFromMain((props as MicroAppLifecycleProps).themeConfig);
  },
});

// 独立运行时
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
