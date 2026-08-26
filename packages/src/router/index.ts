import type { RouteRecordRaw } from 'vue-router';
import {
  ApiOutlined,
  AuditOutlined,
  BookOutlined,
  CloudSyncOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  FolderOutlined,
  FundProjectionScreenOutlined,
  HistoryOutlined,
  KeyOutlined,
  LinkOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  TableOutlined,
  TagsOutlined,
} from '@ant-design/icons-vue';
import { MENU_TYPE } from './utils';

/**
 * 结构化菜单树（用于顶部导航栏渲染：模块 -> 业务分组 -> 具体菜单项）
 */
const menuRoutes: RouteRecordRaw[] = [
  // ================= 1. 元数据中心 =================
  {
    path: '/metadata',
    name: 'MetadataCenter',
    redirect: '/assets',
    meta: {
      title: '元数据中心',
      icon: DatabaseOutlined,
    },
    children: [
      {
        path: 'group-assets',
        name: 'GroupAssets',
        meta: {
          title: '资产底座与编目',
          isGroup: true,
        },
        children: [
          {
            path: '/connectors',
            name: 'ConnectorManage',
            component: () => import('@/views/Connector/index.vue'),
            meta: {
              title: '元数据采集',
              icon: DatabaseOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/collectors',
            name: 'CollectorManage',
            component: () => import('@/views/Collector/index.vue'),
            meta: {
              title: '采集任务',
              icon: CloudSyncOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/collector-instances',
            name: 'CollectorInstanceManage',
            component: () => import('@/views/CollectorInstance/index.vue'),
            meta: {
              title: '采集实例',
              icon: HistoryOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/assets',
            name: 'AssetCatalog',
            component: () => import('@/views/Asset/index.vue'),
            meta: {
              title: '资产目录',
              icon: TagsOutlined,
              keepAlive: true,
            },
          },
        ],
      },
      {
        path: 'group-semantic',
        name: 'GroupSemantic',
        meta: {
          title: '智能语义与打标',
          isGroup: true,
        },
        children: [
          {
            path: '/discovery/candidates',
            name: 'SmartDiscoveryCandidates',
            component: () => import('@/views/Discovery/CandidatePoolView.vue'),
            meta: {
              title: '智能打标候选池',
              icon: SafetyCertificateOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/discovery/taxonomy',
            name: 'SmartDiscoveryTaxonomy',
            component: () => import('@/views/Discovery/TagTaxonomyView.vue'),
            meta: {
              title: '标签体系与规则',
              icon: TagsOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/semantic/term-library',
            name: 'TermLibrary',
            component: () => import('@/views/semantic/term/index.vue'),
            meta: {
              title: '术语管理',
              icon: BookOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/semantic/metric-conflicts',
            name: 'MetricConflicts',
            component: () => import('@/views/semantic/conflicts/index.vue'),
            meta: {
              title: '指标对齐与冲突',
              icon: BookOutlined,
              keepAlive: true,
            },
          },
        ],
      },
      {
        path: 'group-dq',
        name: 'GroupDataQuality',
        meta: {
          title: '数据质量与健康',
          isGroup: true,
        },
        children: [
          {
            path: '/dq/dashboard',
            name: 'DqDashboard',
            component: () => import('@/views/dq-insight/dashboard/index.vue'),
            meta: {
              title: '健康分仪表盘',
              icon: DashboardOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/dq/health',
            name: 'DqHealth',
            component: () => import('@/views/dq-insight/health/index.vue'),
            meta: {
              title: '资产健康分',
              icon: FileSearchOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/dq/channels',
            name: 'DqChannels',
            component: () => import('@/views/dq-insight/channels/index.vue'),
            meta: {
              title: '通道管理',
              icon: ApiOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/dq/asset-linkage',
            name: 'DqAssetLinkage',
            component: () => import('@/views/dq-insight/linkage/index.vue'),
            meta: {
              title: '待关联资产',
              icon: LinkOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/dq/audit-logs',
            name: 'DqAuditLogs',
            component: () => import('@/views/dq-insight/audit-logs/index.vue'),
            meta: {
              title: '质量审计',
              icon: AuditOutlined,
              keepAlive: true,
              adminOnly: true,
            },
          },
        ],
      },
    ],
  },

  // ================= 2. 数据安全中心 =================
  {
    path: '/data-security',
    name: 'DataSecurityCenter',
    redirect: '/sec/grades',
    meta: {
      title: '数据安全中心',
      icon: SafetyCertificateOutlined,
    },
    children: [
      {
        path: 'group-grades',
        name: 'GroupSecurityGrades',
        meta: {
          title: '分类分级',
          isGroup: true,
        },
        children: [
          {
            path: '/sec/grades',
            name: 'DataSecSecurityGrade',
            component: () => import('@/views/DataSecurity/SecurityGrade/index.vue'),
            meta: {
              title: '数据分级',
              icon: SafetyCertificateOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/sec/categories',
            name: 'DataSecDataCategory',
            component: () => import('@/views/DataSecurity/DataCategory/index.vue'),
            meta: {
              title: '数据分类',
              icon: FolderOutlined,
              keepAlive: true,
            },
          },
        ],
      },
      {
        path: 'group-sensitive',
        name: 'GroupSensitive',
        meta: {
          title: '敏感识别与打标',
          isGroup: true,
        },
        children: [
          {
            path: '/sec/sensitive-rules',
            name: 'DataSecSensitiveRule',
            component: () => import('@/views/DataSecurity/SensitiveRule/index.vue'),
            meta: {
              title: '识别特征',
              icon: ScanOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/sec/recognition-rules',
            name: 'DataSecRecognitionRule',
            component: () => import('@/views/DataSecurity/RecognitionRule/index.vue'),
            meta: {
              title: '识别规则',
              icon: SecurityScanOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/sec/recognition-results',
            name: 'DataSecRecognitionResult',
            component: () => import('@/views/DataSecurity/RecognitionResult/index.vue'),
            meta: {
              title: '识别结果',
              icon: FileSearchOutlined,
              keepAlive: true,
            },
          },
        ],
      },
      {
        path: 'group-masking',
        name: 'GroupMasking',
        meta: {
          title: '脱敏与密钥加密',
          isGroup: true,
        },
        children: [
          {
            path: '/sec/masking-rules',
            name: 'DataSecMaskingRule',
            component: () => import('@/views/DataSecurity/MaskingRule/index.vue'),
            meta: {
              title: '脱敏规则',
              icon: FundProjectionScreenOutlined,
              keepAlive: true,
            },
          },
          {
            path: '/sec/key-management',
            name: 'DataSecKeyManagement',
            component: () => import('@/views/DataSecurity/KeyManagement/index.vue'),
            meta: {
              title: '密钥管理',
              icon: KeyOutlined,
              keepAlive: true,
            },
          },
        ],
      },
    ],
  },

  // ================= 3. 系统管理 =================
  {
    path: '/system',
    name: 'SystemManage',
    redirect: '/integration',
    meta: {
      title: '系统管理',
      icon: SettingOutlined,
      adminOnly: true,
    },
    children: [
      {
        path: '/integration',
        name: 'IntegrationManage',
        component: () => import('@/views/Integration/index.vue'),
        meta: {
          title: '集成配置',
          icon: ApiOutlined,
          keepAlive: true,
          adminOnly: true,
        },
      },
      {
        path: '/admin',
        name: 'AdminManage',
        component: () => import('@/views/Admin/index.vue'),
        meta: {
          title: '系统管理',
          icon: SettingOutlined,
          keepAlive: true,
          adminOnly: true,
        },
      },
    ],
  },
];

/**
 * 递归从菜单树中提取所有真实页面叶子路由（用于 Vue Router 扁平注册）
 */
function extractLeafRoutes(routesList: RouteRecordRaw[]): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = [];
  for (const route of routesList) {
    if (route.component || route.components) {
      // 包含组件的真实页面路由
      const { children: _children, ...leafRoute } = route;
      result.push(leafRoute as RouteRecordRaw);
    }
    if (route.children && route.children.length > 0) {
      result.push(...extractLeafRoutes(route.children));
    }
  }
  return result;
}

/**
 * 独立/隐藏/异常路由（不展示在主菜单中，或需要精确 URL 匹配）
 */
const hiddenAndSpecialRoutes: RouteRecordRaw[] = [
  // 根重定向到资产目录
  {
    path: '/',
    redirect: '/assets',
  },
  // 测试 Demo 页
  {
    path: '/table',
    name: 'TableDemo',
    component: () => import('@/views/Demo/index.vue'),
    meta: {
      title: '测试YSSUITable',
      icon: TableOutlined,
      keepAlive: true,
      hidden: true,
    },
  },
  // 资产详情相关内嵌/子路由
  {
    path: '/assets/:id',
    name: 'AssetDetail',
    component: () => import('@/views/AssetDetail/index.vue'),
    meta: {
      title: '资产详情',
      icon: ProfileOutlined,
      keepAlive: true,
      hidden: true,
    },
  },
  {
    path: '/assets/:id/lineage',
    name: 'AssetLineage',
    component: () => import('@/views/Lineage/index.vue'),
    meta: {
      title: '血缘图谱',
      keepAlive: true,
      hidden: true,
    },
  },
  {
    path: '/assets/:id/impact',
    name: 'AssetImpact',
    component: () => import('@/views/ImpactAnalysis/index.vue'),
    meta: {
      title: '影响分析',
      keepAlive: true,
      hidden: true,
    },
  },
  // 数据质量详情相关内嵌/子路由
  {
    path: '/dq/health/:assetId',
    name: 'DqHealthDetail',
    component: () => import('@/views/dq-insight/health/detail.vue'),
    meta: {
      title: '健康分详情',
      keepAlive: false,
      hidden: true,
    },
  },
  {
    path: '/dq/health/:assetId/rules',
    name: 'DqHealthRules',
    component: () => import('@/views/dq-insight/health/rules.vue'),
    meta: {
      title: '规则明细钻取',
      keepAlive: false,
      hidden: true,
    },
  },
  // 404 兜底
  {
    path: '/:pathMatch(.*)*',
    name: 'Exception404',
    component: () => import('@/views/Exception404/index.vue'),
    meta: {
      title: '页面不存在',
      hidden: true,
    },
  },
];

/**
 * 扁平化 Vue Router 完整路由表
 */
const routes: RouteRecordRaw[] = [...hiddenAndSpecialRoutes, ...extractLeafRoutes(menuRoutes)];

export { routes, menuRoutes, MENU_TYPE };
export default routes;
