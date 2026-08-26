<template>
  <div class="category-tree-panel">
    <!-- 1. 顶部操作栏 (严格对齐资产目录 SourceSystemTreePanel) -->
    <div class="tree-header">
      <div class="tree-header-left">
        <span class="tree-title">分类目录</span>
      </div>

      <!-- 右侧操作图标：新建根目录、展开、收起、刷新 -->
      <div class="header-action-icons">
        <a-tooltip title="新建根目录">
          <span class="action-btn" @click="$emit('add-root')">
            <FolderAddOutlined class="action-icon" />
          </span>
        </a-tooltip>
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
        <a-tooltip title="刷新目录树">
          <span class="action-btn" @click="$emit('refresh')">
            <RedoOutlined class="action-icon" />
          </span>
        </a-tooltip>
      </div>
    </div>

    <!-- 2. 视角辅助说明 -->
    <div class="tree-desc">定义数据在安全领域的业务属性并进行多级分类打标与分级治理</div>

    <!-- 3. 全部分类对象汇总条目 (严格对齐资产目录 all-datasource-summary-card) -->
    <div
      :class="[
        'all-category-summary-card',
        { 'is-active': selectedKey === 0 || selectedKey === null || selectedKey === 'all' },
      ]"
      @click="handleSelectAllCategories"
    >
      <div class="summary-left">
        <FolderOpenFilled class="summary-icon" />
        <span class="summary-text">全部分类对象</span>
      </div>
      <span class="summary-count">({{ totalCategories }})</span>
    </div>

    <!-- 4. 单一搜索框 (严格对齐资产目录输入框样式) -->
    <div class="tree-search">
      <a-input
        v-model:value="searchKeyword"
        placeholder="请输入分类目录名称"
        allow-clear
        size="middle"
        class="search-input"
      >
        <template #prefix>
          <SearchOutlined class="text-gray-400" />
        </template>
      </a-input>
    </div>

    <!-- 5. 树内容展示区 (严格对齐资产目录 a-tree 与 custom switcher) -->
    <div ref="treeContainerRef" class="tree-content-container">
      <div v-if="loading && treeData.length === 0" class="tree-loading">
        <a-spin size="small" />
      </div>

      <a-tree
        v-else
        v-model:selected-keys="treeSelectedKeys"
        v-model:expanded-keys="expandedKeys"
        :tree-data="filteredTreeData"
        :block-node="true"
        :show-line="false"
        :show-icon="false"
        class="clean-category-tree"
        @select="handleNodeSelect"
      >
        <!-- 自定义展开折叠三角箭头 -->
        <template #switcherIcon="{ expanded, isLeaf }">
          <span v-if="!isLeaf" class="custom-switcher">
            <CaretDownFilled v-if="expanded" class="switcher-icon" />
            <CaretRightFilled v-else class="switcher-icon" />
          </span>
        </template>

        <!-- 自定义节点渲染 (图标 + 文本 + 数量 + 悬停操作) -->
        <template #title="node">
          <div :class="['custom-tree-node', { 'is-selected': treeSelectedKeys.includes(node.key) }]">
            <div class="node-main-content">
              <span class="node-icon folder-icon">
                <FolderFilled class="icon-folder-svg" />
              </span>
              <span class="node-title" :title="node.nodeName">{{ node.nodeName }}</span>
              <span class="node-count">({{ node.categoryCount ?? 0 }})</span>
            </div>

            <!-- 悬停操作工具栏 -->
            <div class="node-hover-actions" @click.stop>
              <a-tooltip title="添加子目录">
                <span class="node-action-btn" @click.stop="$emit('add-sub', node)">
                  <FolderAddOutlined />
                </span>
              </a-tooltip>
              <a-dropdown :trigger="['click']">
                <span class="node-action-btn" @click.stop>
                  <MoreOutlined />
                </span>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="edit" @click="$emit('edit-node', node)">
                      <EditOutlined style="margin-right: 6px" />编辑目录
                    </a-menu-item>
                    <a-menu-item key="move" @click="$emit('move-node', node)">
                      <ExportOutlined style="margin-right: 6px" />移动目录
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger @click="$emit('delete-node', node)">
                      <DeleteOutlined style="margin-right: 6px" />删除目录
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </template>
      </a-tree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  RedoOutlined,
  FolderFilled,
  FolderOpenFilled,
  FolderAddOutlined,
  MoreOutlined,
  ExportOutlined,
  CaretDownFilled,
  CaretRightFilled,
} from '@ant-design/icons-vue';
import { useTreeHeight } from '@yss-ui/hooks';
import type { CategoryTreeNodeVO } from '@/api/generated/data-security/schemas';

defineOptions({ name: 'CategoryTreePanel' });

const props = withDefaults(
  defineProps<{
    treeData: CategoryTreeNodeVO[];
    selectedKey: number | string | null;
    totalCategories: number;
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'select', keys: any[], info: any): void;
  (e: 'add-root'): void;
  (e: 'add-sub', node: CategoryTreeNodeVO): void;
  (e: 'edit-node', node: CategoryTreeNodeVO): void;
  (e: 'move-node', node: CategoryTreeNodeVO): void;
  (e: 'delete-node', node: CategoryTreeNodeVO): void;
  (e: 'refresh'): void;
}>();

const treeContainerRef = ref<HTMLDivElement>();
useTreeHeight(treeContainerRef);

const searchKeyword = ref('');
const expandedKeys = ref<Array<number | string>>([]);
const treeSelectedKeys = ref<Array<number | string>>([]);

// 递归计算每个节点的汇总分类数，并标准化 key 和 title 字段供 a-tree 消费
const computeRecursiveNode = (node: CategoryTreeNodeVO): any => {
  const children = (node.children || []).map(computeRecursiveNode);
  const directCount = (node as any).categoryCount ?? 0;
  const childrenCount = children.reduce((sum: number, c: any) => sum + (c.categoryCount ?? 0), 0);
  const total = directCount + childrenCount;
  return {
    ...node,
    key: node.id,
    title: node.nodeName,
    categoryCount: total,
    children: children.length > 0 ? children : undefined,
  };
};

const computedTreeData = computed(() => {
  return props.treeData.map(computeRecursiveNode);
});

// 树搜索过滤
const filteredTreeData = computed(() => {
  if (!searchKeyword.value) {
    return computedTreeData.value;
  }

  const keyword = searchKeyword.value.trim().toLowerCase();
  const filterNodes = (nodes: any[]): any[] => {
    return nodes
      .map(node => {
        const match = (node.nodeName || '').toLowerCase().includes(keyword);
        const filteredSubs = node.children ? filterNodes(node.children) : [];
        if (match || filteredSubs.length > 0) {
          return {
            ...node,
            children: filteredSubs.length > 0 ? filteredSubs : undefined,
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  return filterNodes(computedTreeData.value);
});

const handleSelectAllCategories = () => {
  treeSelectedKeys.value = [];
  emit('select', [0], { node: null });
};

const handleNodeSelect = (keys: any[], info: any) => {
  if (!keys.length) {
    handleSelectAllCategories();
    return;
  }
  treeSelectedKeys.value = keys;
  emit('select', keys, info);
};

const getAllKeys = (nodes: any[]): Array<number | string> => {
  let keys: Array<number | string> = [];
  nodes.forEach(n => {
    if (n.key !== undefined) keys.push(n.key);
    if (n.children && n.children.length > 0) {
      keys = keys.concat(getAllKeys(n.children));
    }
  });
  return keys;
};

const expandAll = () => {
  expandedKeys.value = getAllKeys(computedTreeData.value);
};

const collapseAll = () => {
  expandedKeys.value = [];
};

watch(
  () => props.selectedKey,
  newKey => {
    if (newKey === 0 || newKey === null || newKey === 'all') {
      treeSelectedKeys.value = [];
    } else {
      treeSelectedKeys.value = [newKey];
    }
  },
  { immediate: true }
);

watch(
  () => props.treeData,
  () => {
    if (expandedKeys.value.length === 0 && computedTreeData.value.length > 0) {
      expandedKeys.value = getAllKeys(computedTreeData.value);
    }
  },
  { immediate: true }
);
</script>

<style scoped lang="less">
.category-tree-panel {
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

    .tree-header-left {
      display: flex;
      align-items: center;

      .tree-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        user-select: none;
      }
    }

    .header-action-icons {
      display: flex;
      align-items: center;
      gap: 6px;

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

        .action-icon {
          font-size: 13px;
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

  .all-category-summary-card {
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

.clean-category-tree {
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
    justify-content: space-between;
    padding: 0 6px;
    height: 32px;
    font-size: 13px;
    color: #334155;
    width: 100%;

    &.is-selected {
      color: #0f172a;
      font-weight: 500;
    }

    .node-main-content {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;

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
      }

      .node-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #334155;
      }

      .node-count {
        color: #94a3b8;
        font-size: 12px;
        flex-shrink: 0;
      }
    }

    .node-hover-actions {
      display: none;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      margin-left: 6px;

      .node-action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        color: #64748b;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.15s;

        &:hover {
          color: #2563eb;
          background: #eff6ff;
        }
      }
    }

    &:hover .node-hover-actions {
      display: inline-flex;
    }
  }
}
</style>
