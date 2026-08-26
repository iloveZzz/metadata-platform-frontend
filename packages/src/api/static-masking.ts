import { customInstance } from '@/api/mutator';

export interface StaticAlgorithmVO {
  id: number;
  functionName: string;
  displayName: string;
  algorithmType: 'MASK' | 'HASH' | 'CRYPTO' | 'OTHER' | string;
  description: string;
  signature: string;
  supportedEngines: string[];
  sampleOutput: string;
  paramTemplate?: string;
}

export interface ProjectPackageVO {
  id: number;
  projectId: string;
  projectName: string;
  projectCode: string;
  engineType: string;
  packageVersion: string;
  status: 'INSTALLED' | 'UPGRADABLE' | 'NOT_INSTALLED' | string;
  authorizedCount: number;
  authorizedFunctions?: string[];
  installedAt?: string;
  latestVersion?: string;
}

export interface InstallPackageDTO {
  projectId: string;
  projectName?: string;
  engineType?: string;
  packageVersion?: string;
  authorizedFunctions?: string[];
}

export interface StaticMaskTestDTO {
  functionName: string;
  rawValue: string;
  params?: Record<string, any>;
}

export interface StaticMaskTestResultVO {
  functionName: string;
  rawValue: string;
  maskedValue: string;
  costMs: number;
  algorithmType: string;
  sqlSnippet: string;
}

export interface MultiResult<T> {
  code: number;
  data: T[];
  message?: string;
  success?: boolean;
}

export interface SingleResult<T> {
  code: number;
  data: T;
  message?: string;
  success?: boolean;
}

/**
 * 查询静态脱敏算法函数库列表
 */
export const getStaticAlgorithms = (params?: { keyword?: string; algorithmType?: string }) => {
  return customInstance<MultiResult<StaticAlgorithmVO>>({
    url: '/api/v1/static-masking/algorithms',
    method: 'GET',
    params,
  });
};

/**
 * 查询项目算法包安装状态列表
 */
export const getProjectPackages = (params?: { keyword?: string; status?: string }) => {
  return customInstance<MultiResult<ProjectPackageVO>>({
    url: '/api/v1/static-masking/packages',
    method: 'GET',
    params,
  });
};

/**
 * 为项目安装/升级算法包
 */
export const installProjectPackage = (data: InstallPackageDTO) => {
  return customInstance<SingleResult<boolean>>({
    url: '/api/v1/static-masking/packages/install',
    method: 'POST',
    data,
  });
};

/**
 * 在线测试脱敏算法
 */
export const testStaticAlgorithm = (data: StaticMaskTestDTO) => {
  return customInstance<SingleResult<StaticMaskTestResultVO>>({
    url: '/api/v1/static-masking/test-algorithm',
    method: 'POST',
    data,
  });
};
