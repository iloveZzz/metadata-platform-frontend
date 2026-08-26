/**
 * 错误处理工具
 */
import { customMessage } from './message';
import { clearAuthInfo } from '@yss-ui/utils';

// 错误消息映射
const ERROR_MESSAGES: Record<number, string> = {
  401: '登录已过期，请重新登录',
  403: '您没有权限访问该资源',
  404: '请求的资源不存在',
  500: '服务器内部错误，请稍后重试',
};

// 避免重复跳转登录页
let hasRedirectedFor401 = false;

const redirectToLogin = () => {
  if (hasRedirectedFor401) return;
  hasRedirectedFor401 = true;

  // 稍作延迟，确保提示能被用户看到
  const go = () => {
    const loginPath = '/login';
    try {
      // 在微前端和独立运行场景，统一跳主窗口的登录页
      const topWindow = window.top ?? window;
      topWindow.location.assign(loginPath);
    } catch {
      window.location.assign(loginPath);
    }
  };

  // 使用较短延时，避免影响交互
  setTimeout(go, 500);
};

/**
 * 处理HTTP错误响应
 * @param status HTTP状态码
 * @param message 自定义错误消息
 */
export function handleHttpError(status: number, errorMessage?: string) {
  const defaultMessage = ERROR_MESSAGES[status] || '发生未知错误';
  const finalMessage = errorMessage || defaultMessage;

  // 显示错误消息
  customMessage.error(finalMessage);

  if (status === 401) {
    clearAuthInfo();
    redirectToLogin();
  }
}

/**
 * 检查响应状态并处理错误
 * @param response 响应对象
 * @param autoHandle 是否自动处理错误
 */
export function checkResponseStatus(response: any, autoHandle = true) {
  if (response?.status && response.status !== 200) {
    if (autoHandle) {
      handleHttpError(response.status, response.message);
    }
    return false;
  }
  return true;
}
/**
 * 从 HTTP 错误响应中提取错误消息
 * @param error 错误对象
 */
async function extractErrorMessage(error: any): Promise<string | undefined> {
  const responseData = error.response?.data;
  if (!responseData) return undefined;

  // 1. 如果是 Blob 对象（常见于 responseType: 'blob' 的导出/调试/上传接口报错）
  if (responseData instanceof Blob) {
    try {
      if (typeof responseData.text === 'function') {
        const text = await responseData.text();
        const parsed = JSON.parse(text);
        return parsed.message || parsed.msg || parsed.tips;
      }
    } catch (e) {
      console.warn('Failed to parse error Blob response as JSON:', e);
      return undefined;
    }
  }

  // 2. 如果已经是对象
  if (typeof responseData === 'object') {
    return responseData.message || responseData.msg || responseData.tips;
  }

  // 3. 如果是 JSON 字符串
  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData);
      return parsed.message || parsed.msg || parsed.tips;
    } catch {
      return responseData;
    }
  }

  return undefined;
}

/**
 * 全局错误处理器
 * @param error 错误对象
 */
export async function globalErrorHandler(error: any) {
  // 网络错误
  if (!navigator.onLine) {
    customMessage.error('网络连接已断开，请检查网络设置');
    return;
  }

  // HTTP错误
  if (error.response?.status) {
    const errorMessage = await extractErrorMessage(error);
    handleHttpError(error.response.status, errorMessage);
    return;
  }

  // 其他错误
  const errorMessage = error.message || '发生未知错误';
  customMessage.error(errorMessage);
}

/**
 * 统一处理响应错误，保持与老项目一致的拦截行为
 */
export async function handleErrorResponse(error: any) {
  await globalErrorHandler(error);
  return Promise.reject(error);
}
