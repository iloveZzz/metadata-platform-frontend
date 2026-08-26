<template>
  <a-drawer
    v-model:open="visible"
    title="字段识别详情"
    :width="760"
    placement="right"
    destroy-on-close
    class="recognition-detail-drawer"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-container">
        <!-- 1. 基本信息卡片 -->
        <a-card title="基本信息" size="small" class="detail-card">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="数据表名称">
              <span class="font-medium">{{ detail.tableName }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="字段名称">
              <span class="font-medium">{{ detail.fieldName }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="资产来源" :span="2">
              {{ detail.assetSourceInfo || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="样例数据" :span="2">
              <div class="sample-data-row">
                <span class="sample-val">{{ detail.sampleData || '未开启采样或无数据' }}</span>
                <span v-if="detail.samplePreview" class="preview-val"> (脱敏预览: {{ detail.samplePreview }}) </span>
              </div>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 2. 生效结果卡片 -->
        <a-card title="当前生效结果" size="small" class="detail-card">
          <template #extra>
            <a-space>
              <a-button type="link" size="small" @click="handleOpenEdit">编辑识别结果</a-button>
            </a-space>
          </template>
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="生效数据分类">
              <div class="flex items-center gap-2">
                <span class="font-medium text-blue-600">{{ detail.categoryName || '未指定分类' }}</span>
                <a-tag v-if="detail.hasBetterRecommendation" color="orange">存在更优推荐</a-tag>
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="数据分级">
              <span
                class="grade-badge"
                :style="{
                  color: getGradeTagStyle(detail.securityGradeName).color,
                  backgroundColor: getGradeTagStyle(detail.securityGradeName).bg,
                  border: `1px solid ${getGradeTagStyle(detail.securityGradeName).border}`,
                }"
              >
                {{ detail.securityGradeName || 'L1' }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="识别方式">
              <a-tag :color="detail.recognitionMethod === 'MANUAL' ? 'blue' : 'default'">
                {{ detail.recognitionMethod === 'MANUAL' ? '手动指定' : '自动识别' }}
              </a-tag>
              <LockOutlined v-if="detail.isLocked" class="text-amber-500 ml-1" />
            </a-descriptions-item>
            <a-descriptions-item label="规则优先级"> 第 {{ detail.priority || 1 }} 级 </a-descriptions-item>
            <a-descriptions-item label="实际匹配度">
              <a-progress
                :percent="Math.round(detail.confidenceScore || 90)"
                size="small"
                :status="detail.confidenceScore && detail.confidenceScore >= 90 ? 'success' : 'normal'"
              />
            </a-descriptions-item>
            <a-descriptions-item label="更新时间">
              {{ formatDateTimeStr(detail.updatedAt) || '-' }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 3. 识别记录池明细 -->
        <a-card title="识别记录明细" size="small" class="detail-card">
          <div class="records-tip">仲裁排序规则：数据分类优先级 > 数据分级 > 更新时间 > 匹配度 > 分类修改时间</div>
          <a-table
            :data-source="detail.candidateRecords || []"
            :pagination="false"
            size="small"
            row-key="recordId"
            bordered
          >
            <a-table-column key="categoryName" title="数据分类" data-index="categoryName">
              <template #default="{ record }">
                <div class="flex items-center gap-1">
                  <span>{{ record.categoryName || '-' }}</span>
                  <a-tag v-if="record.isRecommended" color="processing">推荐</a-tag>
                  <a-tag v-if="record.isCurrentEffective" color="success">当前生效</a-tag>
                </div>
              </template>
            </a-table-column>
            <a-table-column key="securityGradeName" title="数据分级" data-index="securityGradeName" width="90">
              <template #default="{ record }">
                <span
                  class="grade-badge"
                  :style="{
                    color: getGradeTagStyle(record.securityGradeName).color,
                    backgroundColor: getGradeTagStyle(record.securityGradeName).bg,
                    border: `1px solid ${getGradeTagStyle(record.securityGradeName).border}`,
                  }"
                >
                  {{ record.securityGradeName || 'L1' }}
                </span>
              </template>
            </a-table-column>
            <a-table-column key="recognitionMethod" title="识别方式" data-index="recognitionMethod" width="100">
              <template #default="{ record }">
                {{ record.recognitionMethod === 'MANUAL' ? '手动指定' : '自动识别' }}
              </template>
            </a-table-column>
            <a-table-column key="confidenceScore" title="匹配度" data-index="confidenceScore" width="100">
              <template #default="{ record }"> {{ record.confidenceScore }}% </template>
            </a-table-column>
            <a-table-column key="updatedAt" title="更新时间" width="160">
              <template #default="{ record }">
                <span>{{ formatDateTimeStr(record.updatedAt) || '-' }}</span>
              </template>
            </a-table-column>
            <a-table-column key="action" title="操作" width="110" align="center">
              <template #default="{ record }">
                <a-button v-if="!record.isCurrentEffective" type="link" size="small" @click="handleAdoptRecord(record)">
                  一键指定生效
                </a-button>
                <span v-else class="text-gray-400 text-xs">生效中</span>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </div>
    </a-spin>

    <template #footer>
      <div class="flex justify-end">
        <a-button @click="visible = false">关闭</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { LockOutlined } from '@ant-design/icons-vue';
import {
  getRecognitionResultDetail,
  adoptRecommendation,
  type RecognitionResultDetail,
  type CandidateRecordItem,
} from '@/api/recognition-result';
import { getGradeTagStyle, formatDateTimeStr } from '../constant';

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'open-edit', recordId: number): void;
}>();

const visible = ref(false);
const loading = ref(false);
const detail = ref<RecognitionResultDetail | null>(null);

const open = async (id: number) => {
  visible.value = true;
  loading.value = true;
  try {
    const res = await getRecognitionResultDetail(id);
    detail.value = res?.data || null;
  } catch (e: any) {
    message.error(e?.message || '获取详情失败');
  } finally {
    loading.value = false;
  }
};

const handleOpenEdit = () => {
  if (detail.value) {
    emit('open-edit', detail.value.id);
  }
};

const handleAdoptRecord = async (record?: CandidateRecordItem) => {
  if (!detail.value) return;
  try {
    await adoptRecommendation(detail.value.id, record?.categoryId);
    message.success('已指定为生效结果并标记为手动指定');
    emit('refresh');
    open(detail.value.id);
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
};

defineExpose({
  open,
});
</script>

<style lang="less" scoped>
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-card {
  border-radius: 4px;
}

.sample-data-row {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .sample-val {
    font-family: monospace;
    color: #262626;
  }

  .preview-val {
    font-size: 12px;
    color: #8c8c8c;
  }
}

.records-tip {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}
</style>
