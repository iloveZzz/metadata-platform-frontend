<template>
  <a-drawer v-model:open="visible" title="识别规则详情" width="680px" :destroy-on-close="true" placement="right">
    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-container">
        <!-- 基础信息 -->
        <a-descriptions title="基础配置" :column="2" bordered size="small">
          <a-descriptions-item label="规则名称" :span="2">
            <span class="font-medium">{{ detail.ruleName }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="规则说明" :span="2">
            {{ detail.description || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="负责人">
            {{ detail.owner || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="生效状态">
            <a-tag :color="detail.status === 'ENABLED' ? 'processing' : 'default'">
              {{ detail.status === 'ENABLED' ? '已生效' : '已停用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="已识别打标字段数"> {{ detail.taggedFieldsCount ?? 0 }} 个 </a-descriptions-item>
          <a-descriptions-item label="血缘自动继承">
            {{ detail.lineageInheritanceEnabled ? '是' : '否' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ detail.createdAt || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ detail.updatedAt || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- 数据分类分级配置 -->
        <div class="mt-4">
          <h4 class="section-title">数据分类圈选</h4>
          <div class="config-box">
            <p>
              <strong>圈选模式：</strong>
              <a-tag color="blue">
                {{ formatCategoryMode(detail.categoryScopeMode) }}
              </a-tag>
            </p>
            <div v-if="detail.categoryScopeConfig" class="json-preview">
              <pre>{{ JSON.stringify(detail.categoryScopeConfig, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- 扫描范围配置 -->
        <div class="mt-4">
          <h4 class="section-title">扫描范围配置</h4>
          <div class="config-box">
            <p>
              <strong>数据来源类型：</strong>
              <a-tag :color="detail.scanSourceType === 'COMPUTE_ENGINE' ? 'purple' : 'cyan'">
                {{ detail.scanSourceType === 'COMPUTE_ENGINE' ? '计算源' : '数据源' }}
              </a-tag>
            </p>
            <div v-if="detail.scanSourceType === 'COMPUTE_ENGINE' && detail.computeScopeConfig" class="json-preview">
              <pre>{{ JSON.stringify(detail.computeScopeConfig, null, 2) }}</pre>
            </div>
            <div v-if="detail.scanSourceType === 'DATASOURCE' && detail.datasourceScopeConfig" class="json-preview">
              <pre>{{ JSON.stringify(detail.datasourceScopeConfig, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
    <template #footer>
      <div style="text-align: right">
        <a-button @click="visible = false">关闭</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { RecognitionRuleItem } from '../hooks/useRecognitionRuleTable';

const visible = ref(false);
const loading = ref(false);
const detail = ref<RecognitionRuleItem | null>(null);

function formatCategoryMode(mode?: string) {
  switch (mode) {
    case 'ALL':
      return '全部分类（当前租户下所有生效分类）';
    case 'TREE_NODE':
      return '指定目录下所有分类';
    case 'SPECIFIC':
      return '指定数据分类';
    default:
      return mode || '-';
  }
}

function open(data: RecognitionRuleItem) {
  detail.value = data;
  visible.value = true;
}

defineExpose({ open });
</script>

<style scoped lang="less">
.detail-container {
  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1f2329;
  }

  .config-box {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 12px;

    .json-preview {
      margin-top: 8px;
      background: #ffffff;
      border: 1px solid #e5e6eb;
      border-radius: 4px;
      padding: 8px 12px;
      max-height: 240px;
      overflow-y: auto;

      pre {
        margin: 0;
        font-family: monospace;
        font-size: 12px;
        color: #333;
      }
    }
  }
}
</style>
