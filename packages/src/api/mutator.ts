import axios, { type AxiosRequestConfig } from 'axios'
import JSONbig from 'json-bigint'
import { handleErrorResponse } from '@/utils'

import { handleBusinessError } from './errorHandler';

/** 自定义请求配置扩展，支持跳过全局错误提示 */
export interface CustomRequestConfig extends AxiosRequestConfig {
  /** 是否跳过业务错误（success === false）的全局提示弹窗 */
  skipBusinessError?: boolean;
  /** 是否跳过所有错误（含 HTTP 网络错误）的全局提示弹窗 */
  skipErrorHandler?: boolean;
}

// 创建支持大数字的解析器(关键:storeAsString=true 将大数字转为字符串)
const JSONbigString = JSONbig({ storeAsString: true })

// 获取环境变量，兼容 Node.js 环境（Orval 生成时）和浏览器环境（运行时）
const getBaseURL = () => {
  let envBaseUrl: string | undefined;
  // 优先尝试使用 process.env（Node.js 环境，Orval 生成时）
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL !== undefined) {
    envBaseUrl = process.env.VITE_API_BASE_URL;
  }
  // 在浏览器环境中使用 import.meta.env（运行时）
  try {
    // @ts-ignore - import.meta 在 es2015 目标环境中可能不可用，但运行时可用
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL !== undefined) {
      // @ts-ignore
      envBaseUrl = import.meta.env.VITE_API_BASE_URL;
    }
  } catch (e) {
    // 如果 import.meta 不可用，忽略错误
  }

  if (envBaseUrl !== undefined && envBaseUrl !== '') {
    // 若配置了以 /api 结尾的 base url，而接口自身均带有 /api 前缀，去除多余的 /api 后缀避免双重路径
    return envBaseUrl.replace(/\/api\/?$/, '');
  }
  return '';
}
/** 创建 axios 实例 */
const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 全局配置 transformResponse 处理大数字
const originalTransformResponse = axiosInstance.defaults.transformResponse
axiosInstance.defaults.transformResponse = [
  (data, headers) => {
    try {
      // 仅处理字符串类型的 JSON 响应
      if (typeof data === 'string') {
        // 检查响应头，确保是 JSON 类型
        const contentType = headers?.['content-type'] || headers?.['Content-Type'] || ''
        if (contentType.includes('application/json') || contentType.includes('text/json')) {
          return JSONbigString.parse(data)
        }
      }
      return data // 非字符串或非JSON数据原样返回
    } catch (e) {
      // 解析失败时返回原始数据
      return data
    }
  },
  ...(Array.isArray(originalTransformResponse) ? originalTransformResponse : originalTransformResponse ? [originalTransformResponse] : []),
]

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config: any) => {
    // 防御性处理：避免 baseURL 与 url 均为 /api 导致路径重复 (/api/api/...)
    if (config.baseURL && config.url && typeof config.url === 'string' && config.url.startsWith('/api')) {
      if (config.baseURL === '/api' || config.baseURL.endsWith('/api')) {
        config.baseURL = config.baseURL.replace(/\/api\/?$/, '');
      }
    }

    // /oauth2/token 接口不需要携带 token
    const requestUrl = config?.url || ''
    if (requestUrl.includes('/oauth2/token')) {
      return config
    }

    // 其他接口添加认证 token
    const token = localStorage.getItem('access_token')
    if (token) {
      // 去除 token 首尾可能存在的双引号
      const cleanToken = token.replace(/^"|"$/g, '')
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${cleanToken}`
    }

    // 如果接口url 包含 downLoad 或者 export 需要添加 responseType: 'blob'
    if (requestUrl.includes('downLoad') || requestUrl.includes('export') || requestUrl.includes('download')) {
      config.responseType = 'blob'
    }

    return config
  },
  (error: any) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    const { data, headers, config } = response
    const customConfig = config as CustomRequestConfig
    const isBlob = data instanceof Blob

    // 优先处理业务逻辑错误 (ResultVO)
    // 如果 response.data 是对象且包含 success 字段，并且 success === false
    // 注意：有些接口可能不返回 ResultVO，所以需要严格判断
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      const errorMessage = data.message || '请求失败';
      if (!customConfig?.skipBusinessError && !customConfig?.skipErrorHandler) {
        handleBusinessError(errorMessage);
      }
      // 返回 reject，中断后续 then 链
      const err: any = new Error(errorMessage);
      err.response = response;
      err.data = data;
      return Promise.reject(err);
    }

    return isBlob ? { data, headers } : data
  },
  async (error) => {
    const customConfig = error?.config as CustomRequestConfig;
    if (!customConfig?.skipErrorHandler) {
      await handleErrorResponse(error);
    }
    return Promise.reject(error);
  }
)

/**
 * Orval 的 customInstance 函数
 * @description 用于 Orval 生成的 API 客户端调用
 */
export const customInstance = <T = any>(
  config: CustomRequestConfig,
  options?: CustomRequestConfig,
): Promise<T> => {
  const mergedConfig: CustomRequestConfig = {
    ...config,
    ...options,
    headers: {
      ...config?.headers,
      ...options?.headers,
    },
  };

  // 处理 DELETE 请求的 params
  // DELETE 请求默认会将 params 放到 URL query 中，但后端期望在 request body 中
  if (mergedConfig.method?.toUpperCase() === 'DELETE' && mergedConfig.params) {
    mergedConfig.data = mergedConfig.params;
    delete mergedConfig.params;
  }

  return axiosInstance(mergedConfig) as unknown as Promise<T>;
};

// 默认导出
export default customInstance;
