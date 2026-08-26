<template>
  <div class="metadata-catalog-page">
    <!-- 1. 顶部全局导航 Tab 与控制区 -->
    <div class="metadata-catalog-page__top-nav">
      <!-- 左侧：主视图标签（元数据清单 / 数据表） -->
      <div class="nav-tabs">
        <div
          v-for="tab in METADATA_TABS"
          :key="tab.key"
          :class="['nav-tab-item', { 'is-active': activeTab === tab.key }]"
          @click="handleTabChange(tab.key as any)"
        >
          {{ tab.label }}
        </div>
      </div>

      <!-- 右侧：全局搜索与筛选操作栏 -->
      <div class="nav-controls">
        <a-checkbox v-model:checked="filter.onlyExcluded" class="excluded-checkbox" @change="resetPageAndFetch">
          已剔除数据
        </a-checkbox>

        <a-input
          v-model:value="filter.keyword"
          placeholder="请输入元数据名称或描述"
          allow-clear
          class="global-search-input"
          @press-enter="resetPageAndFetch"
        >
          <template #prefix>
            <SearchOutlined class="text-gray-400" />
          </template>
        </a-input>

        <!-- 高级筛选 Popover -->
        <AssetFilterBar
          v-model:filter="filter"
          :source-options="sourceOptions"
          :domain-options="domainOptions"
          @change="resetPageAndFetch"
        />

        <a-button class="refresh-btn" @click="fetchList">
          <template #icon><RedoOutlined /></template>
        </a-button>
      </div>
    </div>

    <!-- 2. 主体骨架：YSplitPane (左树 + 右表) -->
    <div class="metadata-catalog-page__body">
      <YSplitPane :initial-width="260" :min-width="200" :max-width="400" collapsible class="split-pane-wrapper">
        <!-- 左侧：来源系统/数据源双视角分类树 -->
        <template #left>
          <SourceSystemTreePanel
            :selected-system-name="selectedSystemName ?? undefined"
            @select-node="handleSelectNode"
            @refresh-tree="fetchList"
          />
        </template>

        <!-- 右侧：元数据清单数据展示区 -->
        <template #right>
          <div class="metadata-right-content">
            <!-- 统计 Header 看板 -->
            <AssetHeaderStats :system-name="selectedSystemName ?? undefined" :total-count="currentSystemTotalCount" />

            <!-- 8 列标准表格呈现区 (useTableHeight 自适应高度) -->
            <div ref="tableAreaRef" class="metadata-table-area">
              <YTable
                :columns="METADATA_COLUMNS"
                :data="filteredList"
                :loading="loading"
                :pageable="true"
                :pagination="pagination"
                :row-config="{ isCurrent: true, isHover: true, useKey: true, keyField: 'id' }"
                :max-height="tableHeight"
                @page-change="onPageChange"
              >
                <!-- 1. 元数据名称 (蓝色实体方形表图标 + 链接) -->
                <template #name="{ row }">
                  <div class="meta-name-cell">
                    <div class="meta-icon-box">
                      <DatabaseFilled class="meta-icon" />
                    </div>
                    <a class="meta-name-link" :title="row.name" @click="goDetail(row)">
                      {{ row.name }}
                    </a>
                  </div>
                </template>

                <!-- 2. 采集数据源 (第一行 Dev 徽章 + 连接器链接，第二行 Schema 库名) -->
                <template #source_header>
                  <span>
                    采集数据源
                    <a-tooltip title="底层实际采集的存储连接器实例与 Schema 空间">
                      <InfoCircleOutlined class="header-info-icon" />
                    </a-tooltip>
                  </span>
                </template>
                <template #source="{ row }">
                  <div class="meta-source-cell">
                    <div class="source-top-line">
                      <span
                        v-if="getEnvBadge(row.source)"
                        :class="['env-badge', getEnvBadge(row.source)?.toLowerCase()]"
                      >
                        {{ getEnvBadge(row.source) }}
                      </span>
                      <a class="connector-link" :title="getCleanConnectorName(row.source)">
                        {{ getCleanConnectorName(row.source) }}
                      </a>
                    </div>
                    <div class="source-sub-schema" :title="row.schemaName || 'dataphin02'">
                      {{ row.schemaName || 'dataphin02' }}
                    </div>
                  </div>
                </template>

                <!-- 3. 来源系统 -->
                <template #sourceSystem="{ row }">
                  <span class="meta-system-text">{{ row.sourceSystem || '—' }}</span>
                </template>

                <!-- 3. 元数据类型 (表 / 视图 / 字段) -->
                <template #type="{ row }">
                  <span class="meta-type-text">{{ row.type || '表' }}</span>
                </template>

                <!-- 4. 最新版本 -->
                <template #version="{ row }">
                  <span class="meta-version-text">{{ row.version || '—' }}</span>
                </template>

                <!-- 5. 采集任务 (蓝色跳转链接) -->
                <template #collectorName="{ row }">
                  <a class="collector-task-link" :title="row.collectorName" @click="goToCollector(row)">
                    {{ row.collectorName || 'MySQL采集demo' }}
                  </a>
                </template>

                <!-- 6. 更新频率 (双行排版：定时 / 每日, 04:11) -->
                <template #updateFrequency="{ row }">
                  <div class="frequency-cell">
                    <div class="freq-title">{{ row.updateFrequency || '定时' }}</div>
                    <div class="freq-sub">{{ row.scheduleDescription || '每日, 04:11' }}</div>
                  </div>
                </template>

                <!-- 7. 操作列 (查看详情/血缘、编辑/打标、剔除/删除 3 大核心图标) -->
                <template #action="{ row }">
                  <div class="meta-actions">
                    <a-tooltip title="查看元数据详情与血缘">
                      <a-button type="link" size="small" class="action-icon-btn" @click="goDetail(row)">
                        <ProfileOutlined />
                      </a-button>
                    </a-tooltip>

                    <a-tooltip title="编辑元数据属性与标签">
                      <a-button type="link" size="small" class="action-icon-btn" @click="handleClaim(row)">
                        <EditOutlined />
                      </a-button>
                    </a-tooltip>

                    <a-tooltip :title="row.isExcluded ? '恢复至正常清单' : '剔除此元数据'">
                      <a-button
                        type="link"
                        size="small"
                        danger
                        class="action-icon-btn"
                        @click="handleToggleExclude(row)"
                      >
                        <DeleteOutlined />
                      </a-button>
                    </a-tooltip>
                  </div>
                </template>

                <!-- 空态 -->
                <template #empty>
                  <div class="custom-empty-state">
                    <a-empty description="暂无匹配的元数据清单记录" />
                  </div>
                </template>
              </YTable>
            </div>
          </div>
        </template>
      </YSplitPane>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  SearchOutlined,
  RedoOutlined,
  DatabaseFilled,
  ProfileOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import { YSplitPane, YTable } from '@yss-ui/components';
import { METADATA_TABS, METADATA_COLUMNS } from './constant';
import { useAssetList } from './hooks/useAssetList';
import SourceSystemTreePanel from './components/SourceSystemTreePanel.vue';
import AssetHeaderStats from './components/AssetHeaderStats.vue';
import AssetFilterBar from './components/AssetFilterBar.vue';

defineOptions({ name: 'AssetCatalog' });

const tableAreaRef = ref<HTMLElement>();

const {
  loading,
  filteredList,
  activeTab,
  selectedSystemName,
  currentSystemTotalCount,
  filter,
  pagination,
  tableHeight,
  sourceOptions,
  domainOptions,
  fetchList,
  onPageChange,
  resetPageAndFetch,
  handleSelectNode,
  handleTabChange,
  handleClaim,
  handleToggleExclude,
  goDetail,
  goToCollector,
} = useAssetList({ tableAreaRef });

const getEnvBadge = (name?: string): string | null => {
  if (!name) return null;
  if (/^dev[ _]/i.test(name)) return 'Dev';
  if (/^prod[ _]/i.test(name)) return 'Prod';
  return 'Dev';
};

const getCleanConnectorName = (name?: string): string => {
  if (!name) return '—';
  return name.replace(/^(Dev|Prod)[ _]/i, '');
};
</script>

<style scoped lang="less">
@import './style.less';
</style>
