<template>
  <a-drawer v-model:open="visible" title="批量操作记录" :width="760" placement="right" destroy-on-close>
    <a-spin :spinning="loading">
      <a-table :data-source="historyList" :pagination="false" size="small" row-key="id" bordered>
        <a-table-column key="batchType" title="操作类型" data-index="batchType" width="110">
          <template #default="{ record }">
            <a-tag :color="record.batchType === 'IMPORT' ? 'blue' : 'green'">
              {{ record.batchType === 'IMPORT' ? '批量导入' : '按表添加' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column key="fileName" title="操作内容/文件名" data-index="fileName" />
        <a-table-column key="totalCount" title="总数" data-index="totalCount" width="70" align="center" />
        <a-table-column key="successCount" title="成功" data-index="successCount" width="70" align="center">
          <template #default="{ record }">
            <span class="text-green-600 font-medium">{{ record.successCount }}</span>
          </template>
        </a-table-column>
        <a-table-column key="status" title="状态" data-index="status" width="90" align="center">
          <template #default="{ record }">
            <a-tag :color="record.status === 'SUCCESS' ? 'success' : 'warning'">
              {{ record.status === 'SUCCESS' ? '成功' : '部分失败' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column key="operator" title="操作人" data-index="operator" width="90" />
        <a-table-column key="createdAt" title="操作时间" width="160">
          <template #default="{ record }">
            <span>{{ formatDateTimeStr(record.createdAt) || '-' }}</span>
          </template>
        </a-table-column>
      </a-table>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { getImportHistory, type RecognitionBatchLogItem } from '@/api/recognition-result';
import { formatDateTimeStr } from '../constant';

const visible = ref(false);
const loading = ref(false);
const historyList = ref<RecognitionBatchLogItem[]>([]);

const open = async () => {
  visible.value = true;
  loading.value = true;
  try {
    const res = await getImportHistory();
    historyList.value = res?.data?.data || res?.data || [];
  } catch (e: any) {
    message.error(e?.message || '获取操作记录失败');
  } finally {
    loading.value = false;
  }
};

defineExpose({
  open,
});
</script>
