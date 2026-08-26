/** * 元数据采集与管理工作台（路由 /connectors，替换原数据源管理） *
聚合展示数据源分类卡片集市、采集/实例统计、以及两步式新建元数据采集任务。 */
<script setup lang="ts">
import { computed, ref } from 'vue';
import { YButton } from '@yss-ui/components';
import { PlusOutlined, RedoOutlined } from '@ant-design/icons-vue';
import DatasourceCard from './components/DatasourceCard.vue';
import CreateCollectorModal from './components/CreateCollectorModal.vue';
import { useConnectorList } from './hooks/useConnectorList';
import { DATASOURCE_CATALOG } from './constant';
import type { DatasourceCatalogItem } from './type';

defineOptions({ name: 'MetadataIngestionManage' });

const tableAreaRef = ref<HTMLElement>();

const { loading, loadError, statsMap, fetchList } = useConnectorList({ tableAreaRef });

// 新建采集任务弹窗状态
const createModalVisible = ref(false);
const currentCatalogItem = ref<DatasourceCatalogItem | null>(null);

// 按分类分组数据源
const relationalCatalog = computed(() => DATASOURCE_CATALOG.filter(item => item.category === 'relational'));
const olapCatalog = computed(() => DATASOURCE_CATALOG.filter(item => item.category === 'olap'));
const genericCatalog = computed(() => DATASOURCE_CATALOG.filter(item => item.category === 'generic'));

// 卡片点击：直接打开新建采集任务弹窗，预选当前数据源类型
const handleCardClick = (item: DatasourceCatalogItem) => {
  currentCatalogItem.value = item;
  createModalVisible.value = true;
};

const handleTopCreate = () => {
  currentCatalogItem.value = relationalCatalog.value[0] || null;
  createModalVisible.value = true;
};
</script>

<template>
  <div class="ingestion-page">
    <!-- Header Banner -->
    <div class="ingestion-page__banner">
      <div class="ingestion-page__banner-content">
        <div class="ingestion-page__title">欢迎使用元数据采集与管理</div>
        <div class="ingestion-page__desc">
          元数据中心负责从各类源系统中抽取、加工、集中存储和管理元数据，以支持数据治理，并加强组织内部数据的组织、检索和分析能力。
        </div>
      </div>
      <div class="ingestion-page__banner-actions">
        <YButton :loading="loading" @click="fetchList">
          <template #icon><RedoOutlined /></template>
          刷新
        </YButton>
        <YButton type="primary" @click="handleTopCreate">
          <template #icon><PlusOutlined /></template>
          新建采集任务
        </YButton>
      </div>
    </div>

    <!-- Error Alert -->
    <a-alert
      v-if="loadError"
      class="ingestion-page__error"
      type="error"
      show-icon
      message="数据源列表加载失败"
      description="请检查网络或稍后重试"
    >
      <template #action>
        <YButton size="small" @click="fetchList">重试</YButton>
      </template>
    </a-alert>

    <!-- Content Sections -->
    <div class="ingestion-page__content">
      <!-- 1. 关系型数据库 -->
      <div class="ingestion-page__section">
        <div class="ingestion-page__section-title">关系型数据库</div>
        <div class="ingestion-page__grid">
          <DatasourceCard
            v-for="item in relationalCatalog"
            :key="item.id"
            :item="item"
            :created-count="statsMap[item.id]?.createdCount ?? 0"
            :collected-count="statsMap[item.id]?.collectedCount ?? 0"
            @click="handleCardClick"
          />
        </div>
      </div>

      <!-- 2. 大数据与湖仓分析型数据库 -->
      <div v-if="olapCatalog.length > 0" class="ingestion-page__section">
        <div class="ingestion-page__section-title">大数据与湖仓分析</div>
        <div class="ingestion-page__grid">
          <DatasourceCard
            v-for="item in olapCatalog"
            :key="item.id"
            :item="item"
            :created-count="statsMap[item.id]?.createdCount ?? 0"
            :collected-count="statsMap[item.id]?.collectedCount ?? 0"
            @click="handleCardClick"
          />
        </div>
      </div>

      <!-- 3. 通用与轻量数据库 -->
      <div v-if="genericCatalog.length > 0" class="ingestion-page__section">
        <div class="ingestion-page__section-title">通用与轻量数据库</div>
        <div class="ingestion-page__grid">
          <DatasourceCard
            v-for="item in genericCatalog"
            :key="item.id"
            :item="item"
            :created-count="statsMap[item.id]?.createdCount ?? 0"
            :collected-count="statsMap[item.id]?.collectedCount ?? 0"
            @click="handleCardClick"
          />
        </div>
      </div>
    </div>

    <!-- 两步式新建采集任务弹窗 -->
    <CreateCollectorModal
      v-model:open="createModalVisible"
      :selected-catalog-item="currentCatalogItem"
      :catalog-list="DATASOURCE_CATALOG"
      @success="fetchList"
    />
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
