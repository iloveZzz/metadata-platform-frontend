<script setup lang="ts">
import { YButton, YCard } from '@yss-ui/components';
import { CopyOutlined, DatabaseFilled, StarFilled, StarOutlined, WarningOutlined } from '@ant-design/icons-vue';
import { useAssetDetail } from './hooks/useAssetDetail';
import AssetDetailTabs from './components/AssetDetailTabs.vue';

defineOptions({ name: 'AssetDetail' });

const {
  loading,
  loadError,
  detail,
  readonly,
  isArchived,
  tagModalOpen,
  tagDraft,
  savingTags,
  fetchDetail,
  handleToggleFavorite,
  handleClaim,
  openTagModal,
  closeTagModal,
  handleSaveTags,
  handleArchive,
  handleUnarchive,
  handleCopyTableName,
  goToCollector,
  goToConnector,
  goBack,
  goBackCatalog,
} = useAssetDetail();
</script>

<template>
  <div class="asset-detail-page">
    <YCard class="asset-detail-page__card" :bordered="false">
      <!-- 顶部面包屑导航 -->
      <a-breadcrumb class="asset-detail-page__breadcrumb">
        <a-breadcrumb-item>
          <a class="breadcrumb-link" @click="goBack">元数据清单</a>
        </a-breadcrumb-item>
        <a-breadcrumb-item>元数据详情</a-breadcrumb-item>
      </a-breadcrumb>

      <!-- 顶部主 Banner -->
      <div class="asset-detail-page__header">
        <div class="asset-header-main">
          <!-- 蓝色方形元数据徽标 -->
          <div class="meta-icon-badge">
            <DatabaseFilled class="meta-icon" />
            <span class="meta-icon-text">元数据</span>
          </div>

          <!-- 标题与核心元数据属性行 -->
          <div class="asset-header-info">
            <!-- 第一行：表全名 + 复制按钮 + 状态Tag -->
            <div class="asset-title-row">
              <span class="asset-title">{{ detail.name || 'dataphin01.wp_table11' }}</span>
              <a-tooltip title="复制表名">
                <a-button type="text" size="small" class="copy-btn" @click="handleCopyTableName">
                  <CopyOutlined />
                </a-button>
              </a-tooltip>
              <a-tag v-if="detail.taintStatus === 'TAINTED'" color="error" style="margin-left: 8px">
                <WarningOutlined /> 数据存疑
              </a-tag>
              <a-tag v-if="readonly" color="default" style="margin-left: 8px">
                {{ isArchived ? '已归档 · 只读' : '已删除 · 只读' }}
              </a-tag>
            </div>

            <!-- 第二行：元数据属性信息 -->
            <div class="asset-meta-summary-row">
              <div class="meta-summary-item">
                <span class="meta-summary-label">数据源类型：</span>
                <span class="meta-summary-value">{{ detail.datasourceType || 'MySQL' }}</span>
              </div>
              <div class="meta-summary-item">
                <span class="meta-summary-label">数据源：</span>
                <span class="env-tag dev">Dev</span>
                <a class="meta-link" @click="goToConnector">
                  {{ detail.source || 'mysql测试演示(ts_mysql2_dev)' }}
                </a>
              </div>
              <div class="meta-summary-item">
                <span class="meta-summary-label">所属 Database：</span>
                <span class="meta-summary-value">{{ detail.databaseName || detail.schemaName || 'dataphin01' }}</span>
              </div>
              <div class="meta-summary-item">
                <span class="meta-summary-label">元数据类型：</span>
                <span class="meta-summary-value">{{
                  detail.type === 'table' || !detail.type ? '表' : detail.type
                }}</span>
              </div>
              <div class="meta-summary-item">
                <span class="meta-summary-label">采集任务：</span>
                <a class="meta-link collector-link" @click="goToCollector">
                  {{ detail.collectorName || 'MySQL采集demo' }}
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧操作栏 -->
        <div class="asset-header-actions">
          <a-space wrap>
            <a-button :disabled="loading" @click="handleToggleFavorite">
              <template #icon>
                <StarFilled v-if="detail.favorite" style="color: #faad14" />
                <StarOutlined v-else />
              </template>
              {{ detail.favorite ? '已收藏' : '收藏' }}
            </a-button>
            <template v-if="!readonly">
              <a-button :disabled="loading" @click="openTagModal">编辑标签</a-button>
              <a-button :disabled="loading || !!detail.owner" @click="handleClaim">
                {{ detail.owner ? '已认领' : '认领' }}
              </a-button>
              <a-button danger :disabled="loading" @click="handleArchive">归档</a-button>
            </template>
            <a-button v-else-if="isArchived" @click="handleUnarchive">取消归档</a-button>
          </a-space>
        </div>
      </div>

      <a-alert
        v-if="readonly"
        type="info"
        show-icon
        class="asset-detail-page__readonly-alert"
        :message="isArchived ? '已归档资产只读：编辑、补录与归档操作已禁用' : '已删除资产（源端删除标记）：只读'"
      />

      <a-alert
        v-if="loadError"
        type="error"
        show-icon
        class="asset-detail-page__error"
        message="资产详情加载失败"
        description="请检查网络或稍后重试"
      >
        <template #action>
          <YButton size="small" @click="fetchDetail">重试</YButton>
          <YButton size="small" @click="goBackCatalog">返回目录</YButton>
        </template>
      </a-alert>

      <a-spin :spinning="loading">
        <div v-if="!loadError" class="asset-detail-page__tabs">
          <AssetDetailTabs :detail="detail" />
        </div>
      </a-spin>

      <a-modal
        v-model:open="tagModalOpen"
        title="编辑标签"
        ok-text="保存"
        cancel-text="取消"
        :confirm-loading="savingTags"
        @ok="handleSaveTags"
        @cancel="closeTagModal"
      >
        <a-select v-model:value="tagDraft" mode="tags" placeholder="输入后回车添加" style="width: 100%" />
      </a-modal>
    </YCard>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
