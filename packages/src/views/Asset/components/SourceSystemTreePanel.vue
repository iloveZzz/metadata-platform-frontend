<template>
  <div class="source-system-tree-panel">
    <!-- 1. 顶部视角切换器与操作区 (对齐截图) -->
    <div class="tree-header">
      <div class="perspective-header-left">
        <a-dropdown v-model:open="dropdownOpen" :trigger="['click']">
          <a class="perspective-title" @click.prevent>
            <span>{{ currentPerspectiveConfig.shortLabel }}</span>
            <DownOutlined v-if="!dropdownOpen" class="arrow-icon" />
            <UpOutlined v-else class="arrow-icon" />
          </a>
          <template #overlay>
            <div class="perspective-dropdown-menu">
              <div
                v-for="opt in PERSPECTIVE_OPTIONS"
                :key="opt.value"
                :class="['menu-item', { 'is-active': selectedPerspective === opt.value }]"
                @click="handleSelectPerspective(opt.value)"
              >
                {{ opt.label }}
              </div>
            </div>
          </template>
        </a-dropdown>
      </div>

      <!-- 右侧展开与收起按钮 (对齐截图方框箭头按钮) -->
      <div class="header-action-icons">
        <a-tooltip title="展开全部">
          <span class="action-btn" @click="expandAll">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" class="action-svg">
              <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.2" />
              <path
                d="M5 6.5L8 9.5L11 6.5"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </a-tooltip>
        <a-tooltip title="收起全部">
          <span class="action-btn" @click="collapseAll">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" class="action-svg">
              <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.2" />
              <path
                d="M5 9.5L8 6.5L11 9.5"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </a-tooltip>
      </div>
    </div>

    <!-- 2. 视角辅助说明 -->
    <div class="tree-desc">{{ currentPerspectiveConfig.desc }}</div>

    <!-- 3. 数据源视角专属：全部数据源对象汇总条目 -->
    <div
      v-if="selectedPerspective === 'datasource'"
      :class="['all-datasource-summary-card', { 'is-active': selectedKeys.includes('all_datasource_summary') }]"
      @click="handleSelectAllDatasources"
    >
      <div class="summary-left">
        <FolderOpenFilled class="summary-icon" />
        <span class="summary-text">全部数据源对象</span>
      </div>
      <span class="summary-count">({{ connectors.length }})</span>
    </div>

    <!-- 4. 搜索框 (请输入来源系统名称 / 请输入数据源名称) -->
    <div class="tree-search">
      <a-input
        v-model:value="searchKeyword"
        :placeholder="currentPerspectiveConfig.placeholder"
        allow-clear
        size="middle"
        class="search-input"
      >
        <template #prefix>
          <SearchOutlined class="text-gray-400" />
        </template>
      </a-input>
    </div>

    <!-- 5. 树内容展示区 -->
    <div ref="treeContainerRef" class="tree-content-container">
      <div v-if="loading && currentTreeData.length === 0" class="tree-loading">
        <a-spin size="small" />
      </div>

      <a-tree
        v-else
        v-model:selected-keys="selectedKeys"
        v-model:expanded-keys="expandedKeys"
        :tree-data="filteredTreeData"
        :block-node="true"
        :show-line="false"
        :show-icon="false"
        class="clean-source-system-tree"
        @select="handleNodeSelect"
      >
        <!-- 自定义展开折叠箭头 -->
        <template #switcherIcon="{ expanded, isLeaf }">
          <span v-if="!isLeaf" class="custom-switcher">
            <CaretDownFilled v-if="expanded" class="switcher-icon" />
            <CaretRightFilled v-else class="switcher-icon" />
          </span>
        </template>

        <!-- 自定义节点渲染 -->
        <template #title="node">
          <div :class="['custom-tree-node', { 'is-selected': selectedKeys.includes(node.key) }]">
            <!-- 节点图标 -->
            <span v-if="node.nodeType === 'system'" class="node-icon folder-icon">
              <!-- 来源系统分组：文件夹图标 -->
              <FolderFilled class="icon-folder-svg" />
            </span>
            <span v-else-if="node.nodeType === 'category'" class="node-icon category-icon">
              <!-- 数据源分类：分类图标 -->
              <FolderFilled class="icon-folder-svg" />
            </span>
            <span v-else-if="node.nodeType === 'datasource'" class="node-icon datasource-icon">
              <!-- 连接器节点：服务器/硬盘图标 -->
              <HddFilled class="icon-datasource-svg" />
            </span>
            <span v-else class="node-icon database-icon">
              <!-- 数据库 Schema 节点：数据库圆柱图标 -->
              <DatabaseFilled class="icon-database-svg" />
            </span>

            <span class="node-title" :title="node.title">{{ node.title }}</span>
          </div>
        </template>
      </a-tree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  DownOutlined,
  UpOutlined,
  SearchOutlined,
  FolderFilled,
  FolderOpenFilled,
  DatabaseFilled,
  HddFilled,
  CaretDownFilled,
  CaretRightFilled,
} from '@ant-design/icons-vue';
import { useTreeHeight } from '@yss-ui/hooks';
import { GetConnectors, GetAssets } from '@/api';
import { customInstance } from '@/api/mutator';
import { PERSPECTIVE_OPTIONS } from '../constant';
import type { PerspectiveType, SourceSystemTreeNode } from '../type';

defineOptions({ name: 'SourceSystemTreePanel' });

defineProps<{
  selectedSystemName?: string;
}>();

const emit = defineEmits<{
  (
    e: 'select-node',
    payload: {
      type: 'system' | 'datasource' | 'category' | 'database' | 'root' | 'connector' | 'all';
      name: string;
      id?: string;
      code?: string;
      database?: string;
      datasourceId?: string;
      source?: string;
      systemName?: string;
      systemCode?: string;
    }
  ): void;
  (e: 'refresh-tree'): void;
}>();

const dropdownOpen = ref(false);
const selectedPerspective = ref<PerspectiveType>('datasource');

const currentPerspectiveConfig = computed(() => {
  const hit = PERSPECTIVE_OPTIONS.find(p => p.value === selectedPerspective.value);
  return (
    hit || {
      value: 'datasource',
      label: '数据源视角',
      shortLabel: '数据源视角',
      desc: '按照采集配置的来源数据源浏览与检索',
      placeholder: '请输入数据源名称',
    }
  );
});

const searchKeyword = ref('');
const treeContainerRef = ref<HTMLDivElement>();
const loading = ref(false);

const systems = ref<{ code: string; name: string; category?: string }[]>([]);
const connectors = ref<
  { id: string; name: string; type: string; host?: string; systemName?: string; sourceSystem?: string }[]
>([]);
const connectorDatabases = ref<Record<string, string[]>>({});

const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

useTreeHeight(treeContainerRef);

/** 拉取应用系统名录、数据源与元数据资产数据库空间 */
const fetchData = async () => {
  loading.value = true;
  try {
    const [sysRes, connRes, assetRes] = await Promise.all([
      customInstance<{ data?: any[] }>({ url: '/api/connectors/systems', method: 'GET' }).catch(() => ({ data: [] })),
      GetConnectors().catch(() => ({ data: [] })),
      GetAssets({ size: 100 } as any).catch(() => ({ data: [] })),
    ]);

    const sysList = ((sysRes as any)?.data || []) as any[];
    systems.value = sysList.map(s => ({
      code: s.code || s.id || s.name,
      name: s.name || s.code,
      category: s.category || '业务系统',
    }));

    // 统计各数据源下的数据库空间 (Level 3) 以及连接器所属系统映射
    const dbMap: Record<string, Set<string>> = {};
    const connectorSystemMap: Record<string, string> = {};
    const rawAssets = ((assetRes as any)?.data || []) as any[];
    rawAssets.forEach(a => {
      const connKey = a.sourceId || a.source || 'default';
      const db = a.databaseName || a.schemaName || 'dataphin02';
      if (!dbMap[connKey]) {
        dbMap[connKey] = new Set<string>();
      }
      dbMap[connKey].add(db);
      if (a.sourceId && a.sourceSystem) {
        connectorSystemMap[a.sourceId] = a.sourceSystem;
      }
      if (a.source && a.sourceSystem) {
        connectorSystemMap[a.source] = a.sourceSystem;
      }
    });

    const connList = ((connRes as any)?.data || []) as any[];
    connectors.value = connList.map(c => {
      const mappedSys = connectorSystemMap[c.id] || connectorSystemMap[c.name];
      return {
        id: c.id,
        name: c.name,
        type: c.type || 'MySQL',
        host: c.host || '',
        systemName: c.systemName || c.sourceSystem || mappedSys,
        sourceSystem: c.sourceSystem || c.systemName || mappedSys,
      };
    });

    const parsedDbMap: Record<string, string[]> = {};
    connectors.value.forEach(c => {
      const set = dbMap[c.id] || dbMap[c.name] || new Set(['dataphin02']);
      if (set.size === 0) {
        set.add('dataphin02');
      }
      parsedDbMap[c.id] = Array.from(set);
    });
    connectorDatabases.value = parsedDbMap;
  } finally {
    loading.value = false;
  }
};

/** 关系型与大数据分类映射 */
const CATEGORY_MAP: Record<string, string[]> = {
  关系型数据库: ['mysql', 'oracle', 'postgresql', 'sqlserver', 'mariadb', 'dm', 'kingbase', 'oceanbase', 'tidb'],
  大数据与湖仓分析: ['hive', 'clickhouse', 'starrocks', 'doris', 'presto', 'trino', 'hbase', 'spark'],
  通用与轻量数据库: ['sqlite', 'h2', 'mongodb', 'redis', 'elasticsearch'],
};

/** 构建当前视角下的 3 级完整树 */
const currentTreeData = computed<SourceSystemTreeNode[]>(() => {
  if (selectedPerspective.value === 'source_system') {
    // 1. 来源系统视角 (系统名录 -> 连接器 -> 数据库)
    const result: SourceSystemTreeNode[] = [];
    const usedConnectorIds = new Set<string>();

    systems.value.forEach(sys => {
      const curName = (sys.name || '').trim().toLowerCase();
      const curCode = (sys.code || '').trim().toLowerCase();
      const matched = connectors.value.filter(c => {
        const sysName = (c.systemName || '').trim().toLowerCase();
        const sysCode = (c.sourceSystem || '').trim().toLowerCase();
        const host = (c.host || '').trim().toLowerCase();
        return (
          (sysName && (sysName === curName || sysName === curCode)) ||
          (sysCode && (sysCode === curName || sysCode === curCode)) ||
          (curName && host.includes(curName)) ||
          (curCode && host.includes(curCode))
        );
      });

      matched.forEach(m => usedConnectorIds.add(m.id));

      const connectorChildren: SourceSystemTreeNode[] = matched.map(c => {
        const dbs = connectorDatabases.value[c.id] || ['dataphin02'];
        const dbChildren: SourceSystemTreeNode[] = dbs.map(db => ({
          id: `db_sys_${sys.code}_${c.id}_${db}`,
          key: `db_sys_${sys.code}_${c.id}_${db}`,
          title: db,
          name: db,
          nodeType: 'database',
          databaseName: db,
          datasourceId: c.id,
          datasourceName: c.name,
          datasourceType: c.type,
          systemName: sys.name,
          systemCode: sys.code,
        }));

        return {
          id: `ds_sys_${sys.code}_${c.id}`,
          key: `ds_sys_${sys.code}_${c.id}`,
          title: `${c.name} (${(c.type || 'mysql').toLowerCase()})`,
          name: c.name,
          nodeType: 'datasource',
          datasourceId: c.id,
          datasourceType: c.type,
          systemName: sys.name,
          systemCode: sys.code,
          children: dbChildren,
        };
      });

      result.push({
        id: `sys_${sys.code || sys.name}`,
        key: `sys_${sys.code || sys.name}`,
        title: `${sys.name} [${sys.code || sys.name}] (${matched.length})`,
        name: sys.name,
        nodeType: 'system',
        systemName: sys.name,
        systemCode: sys.code,
        count: matched.length,
        children: connectorChildren.length > 0 ? connectorChildren : undefined,
      });
    });

    return result;
  } else {
    // 2. 数据源视角 (分类 -> 连接器 -> 数据库)
    const result: SourceSystemTreeNode[] = [];
    const usedConnectorIds = new Set<string>();

    Object.entries(CATEGORY_MAP).forEach(([categoryName, types]) => {
      const matched = connectors.value.filter(c => {
        const cType = (c.type || '').trim().toLowerCase();
        return types.includes(cType);
      });

      matched.forEach(m => usedConnectorIds.add(m.id));

      if (matched.length > 0 || categoryName === '关系型数据库') {
        result.push({
          id: `cat_${categoryName}`,
          key: `cat_${categoryName}`,
          title: `${categoryName} (${matched.length})`,
          name: categoryName,
          nodeType: 'category',
          count: matched.length,
          children: matched.map(c => {
            const dbs = connectorDatabases.value[c.id] || ['dataphin02'];
            return {
              id: `ds_cat_${c.id}`,
              key: `ds_cat_${c.id}`,
              title: `${c.name} (${(c.type || 'mysql').toLowerCase()})`,
              name: c.name,
              nodeType: 'datasource',
              datasourceId: c.id,
              datasourceType: c.type,
              children: dbs.map(db => ({
                id: `db_cat_${c.id}_${db}`,
                key: `db_cat_${c.id}_${db}`,
                title: db,
                name: db,
                nodeType: 'database',
                databaseName: db,
                datasourceId: c.id,
                datasourceName: c.name,
                datasourceType: c.type,
              })),
            };
          }),
        });
      }
    });

    const rest = connectors.value.filter(c => !usedConnectorIds.has(c.id));
    if (rest.length > 0) {
      result.push({
        id: 'cat_other',
        key: 'cat_other',
        title: `其他数据库与存储 (${rest.length})`,
        name: '其他数据库与存储',
        nodeType: 'category',
        count: rest.length,
        children: rest.map(c => {
          const dbs = connectorDatabases.value[c.id] || ['dataphin02'];
          return {
            id: `ds_cat_${c.id}`,
            key: `ds_cat_${c.id}`,
            title: `${c.name} (${(c.type || 'mysql').toLowerCase()})`,
            name: c.name,
            nodeType: 'datasource',
            datasourceId: c.id,
            datasourceType: c.type,
            children: dbs.map(db => ({
              id: `db_cat_${c.id}_${db}`,
              key: `db_cat_${c.id}_${db}`,
              title: db,
              name: db,
              nodeType: 'database',
              databaseName: db,
              datasourceId: c.id,
              datasourceName: c.name,
              datasourceType: c.type,
            })),
          };
        }),
      });
    }

    return result;
  }
});

/** 树搜索过滤 (支持按数据库名、数据源名、系统名过滤) */
const filteredTreeData = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return currentTreeData.value;
  }

  const filterNode = (node: SourceSystemTreeNode): SourceSystemTreeNode | null => {
    const isMatch =
      (node.title || '').toLowerCase().includes(keyword) ||
      (node.name || '').toLowerCase().includes(keyword) ||
      (node.databaseName || '').toLowerCase().includes(keyword) ||
      (node.systemName || '').toLowerCase().includes(keyword);
    const filteredChildren = (node.children || [])
      .map(child => filterNode(child))
      .filter((child): child is SourceSystemTreeNode => child !== null);

    if (isMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      };
    }
    return null;
  };

  return currentTreeData.value
    .map(node => filterNode(node))
    .filter((node): node is SourceSystemTreeNode => node !== null);
});

// 当树数据变化时初始化展开与选中首项
watch(
  () => currentTreeData.value,
  data => {
    if (data.length > 0 && selectedKeys.value.length === 0) {
      expandedKeys.value = data.map(d => String(d.key));
      const first = data[0];
      selectedKeys.value = [String(first.key)];
      emit('select-node', {
        type: first.nodeType || 'datasource',
        name: first.name,
        code: first.systemCode,
      });
    }
  },
  { immediate: true }
);

const handleSelectPerspective = (val: string) => {
  selectedPerspective.value = val as PerspectiveType;
  dropdownOpen.value = false;
  selectedKeys.value = [];
  searchKeyword.value = '';
  setTimeout(() => {
    expandedKeys.value = currentTreeData.value.map(d => String(d.key));
    if (currentTreeData.value.length > 0) {
      const first = currentTreeData.value[0];
      selectedKeys.value = [String(first.key)];
      emit('select-node', {
        type: first.nodeType || 'datasource',
        name: first.name,
        code: first.systemCode,
      });
    }
  }, 50);
};

const handleSelectAllDatasources = () => {
  selectedKeys.value = ['all_datasource_summary'];
  emit('select-node', {
    type: 'all',
    name: '全部数据源对象',
  });
};

const expandAll = () => {
  const allKeys: string[] = [];
  const collect = (nodes: SourceSystemTreeNode[]) => {
    nodes.forEach(n => {
      allKeys.push(String(n.key));
      if (n.children && n.children.length > 0) {
        collect(n.children);
      }
    });
  };
  collect(currentTreeData.value);
  expandedKeys.value = allKeys;
};

const collapseAll = () => {
  expandedKeys.value = [];
};

const handleNodeSelect = (keys: any[], info: any) => {
  if (!keys.length) {
    return;
  }
  const selectedKey = keys[0];
  selectedKeys.value = [selectedKey];
  const node = info?.node?.dataRef as SourceSystemTreeNode;
  if (!node) return;

  if (node.nodeType === 'database') {
    emit('select-node', {
      type: 'database',
      name: node.name,
      database: node.databaseName || node.name,
      datasourceId: node.datasourceId,
      source: node.datasourceName,
      systemCode: node.systemCode,
      systemName: node.systemName,
    });
  } else if (node.nodeType === 'datasource') {
    emit('select-node', {
      type: 'datasource',
      name: node.name,
      id: node.datasourceId,
      systemCode: node.systemCode,
      systemName: node.systemName,
    });
  } else if (node.nodeType === 'category') {
    emit('select-node', {
      type: 'category',
      name: node.name,
    });
  } else {
    emit('select-node', {
      type: 'system',
      name: node.name,
      code: node.systemCode,
      systemName: node.systemName || node.name,
    });
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped lang="less">
.source-system-tree-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  background: #ffffff;
  border-right: 1px solid #f1f5f9;
  overflow: hidden;
  box-sizing: border-box;

  .tree-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    padding: 0 2px;
    flex-shrink: 0;

    .perspective-header-left {
      display: flex;
      align-items: center;
    }

    .perspective-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      cursor: pointer;
      user-select: none;

      &:hover {
        color: #2563eb;
      }

      .arrow-icon {
        font-size: 12px;
        color: #4b5563;
        transition: transform 0.2s ease;
      }
    }

    .header-action-icons {
      display: flex;
      align-items: center;
      gap: 8px;

      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        color: #94a3b8;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;

        &:hover {
          color: #2563eb;
          background-color: #f1f5f9;
        }

        .action-svg {
          display: block;
        }
      }
    }
  }

  .tree-desc {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;
    padding: 0 2px;
    line-height: 1.4;
    flex-shrink: 0;
  }

  .all-datasource-summary-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 6px;
    margin-bottom: 12px;
    cursor: pointer;
    border: 1px solid #f1f5f9;
    transition: all 0.2s;

    &:hover {
      background: #f1f5f9;
    }

    &.is-active {
      background: #e6f4ff;
      border-color: #91caff;

      .summary-text {
        color: #1677ff;
        font-weight: 600;
      }
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .summary-icon {
        color: #2563eb;
        font-size: 16px;
      }

      .summary-text {
        font-size: 13px;
        font-weight: 500;
        color: #0f172a;
      }
    }

    .summary-count {
      font-size: 13px;
      color: #64748b;
    }
  }

  .tree-search {
    margin-bottom: 12px;
    padding: 0 2px;
    flex-shrink: 0;

    .search-input {
      border-radius: 6px;
    }
  }

  .tree-content-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    padding: 0 2px;

    .tree-loading {
      display: flex;
      justify-content: center;
      padding: 24px 0;
    }
  }
}

.perspective-dropdown-menu {
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 140px;
  border: 1px solid #f1f5f9;

  .menu-item {
    padding: 8px 12px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;

    &:hover {
      background-color: #f9fafb;
    }

    &.is-active {
      background-color: #e6f4ff;
      color: #111827;
      font-weight: 600;
    }
  }
}

.clean-source-system-tree {
  background: transparent;

  :deep(.ant-tree-treenode) {
    padding: 2px 0;
    width: 100%;
  }

  :deep(.ant-tree-node-content-wrapper) {
    padding: 0;
    border-radius: 4px;
    transition: background-color 0.15s ease;
    line-height: 32px;
    height: 32px;

    &:hover {
      background-color: #f8fafc;
    }
  }

  :deep(.ant-tree-node-selected) {
    background-color: #e6f4ff !important;
  }

  :deep(.ant-tree-switcher) {
    line-height: 32px;
    width: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .custom-switcher {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #334155;

    .switcher-icon {
      font-size: 10px;
    }
  }

  .custom-tree-node {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px;
    height: 32px;
    font-size: 13px;
    color: #334155;

    &.is-selected {
      color: #0f172a;
      font-weight: 500;
    }

    .node-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.folder-icon {
        .icon-folder-svg {
          color: #64748b;
          font-size: 14px;
        }
      }

      &.category-icon {
        .icon-folder-svg {
          color: #64748b;
          font-size: 14px;
        }
      }

      &.datasource-icon {
        .icon-database-svg {
          color: #2563eb;
          font-size: 13px;
        }
      }
    }

    .node-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
  }
}
</style>
