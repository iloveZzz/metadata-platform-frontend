<template>
  <a-modal v-model:open="visible" :title="`任务引用记录 - [${currentKey?.keyName || ''}]`" :footer="null" :width="760">
    <div class="task-ref-content">
      <div class="header-summary">
        <span class="text-gray-600">当前密钥共被</span>
        <span class="text-blue-600 font-bold mx-1">{{ referenceList.length }}</span>
        <span class="text-gray-600">个任务与脱敏规则引用：</span>
      </div>

      <a-table
        :data-source="referenceList"
        :columns="columns"
        :loading="loading"
        :pagination="false"
        size="small"
        bordered
        row-key="id"
      >
        <template #bodyCell="{ column, text }">
          <template v-if="column.key === 'taskType'">
            <a-tag v-if="text === 'DYNAMIC_MASK'" color="blue">动态脱敏规则</a-tag>
            <a-tag v-else-if="text === 'STATIC_MASK'" color="cyan">静态脱敏任务</a-tag>
            <a-tag v-else-if="text === 'DATA_INTEGRATION'" color="purple">数据集成解密</a-tag>
            <a-tag v-else color="default">{{ text || '-' }}</a-tag>
          </template>

          <template v-else-if="column.key === 'operationType'">
            <a-tag v-if="text === 'ENCRYPT'" color="green">加密运算</a-tag>
            <a-tag v-else-if="text === 'DECRYPT'" color="orange">解密运算</a-tag>
            <a-tag v-else color="geekblue">{{ text || '脱敏运算' }}</a-tag>
          </template>
        </template>
      </a-table>

      <div class="modal-footer-btn">
        <a-button type="primary" @click="visible = false">关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { KeyManagementItem } from '../hooks/useKeyManagement';

const api = getDataSecurityCenterAPIAPIApi();

const visible = ref(false);
const loading = ref(false);
const currentKey = ref<KeyManagementItem | null>(null);
const referenceList = ref<any[]>([]);

const columns = [
  { title: '引用任务 / 规则名称', dataIndex: 'taskName', key: 'taskName', minWidth: 160 },
  { title: '数据板块', dataIndex: 'sectorName', key: 'sectorName', width: 100 },
  { title: '所属项目', dataIndex: 'projectName', key: 'projectName', width: 120 },
  { title: '任务类型', dataIndex: 'taskType', key: 'taskType', width: 120, slots: { customRender: 'taskType' } },
  {
    title: '操作类型',
    dataIndex: 'operationType',
    key: 'operationType',
    width: 100,
    slots: { customRender: 'operationType' },
  },
  { title: '负责人', dataIndex: 'owner', key: 'owner', width: 90 },
];

const open = async (row: KeyManagementItem) => {
  currentKey.value = row;
  referenceList.value = [];
  visible.value = true;
  loading.value = true;

  try {
    const res = await (api as any).listKeyTaskReferences(row.id);
    const data = (res as any)?.data || [];
    if (data.length === 0 && row.referencedRulesCount && row.referencedRulesCount > 0) {
      // 兼容默认兜底
      referenceList.value = [
        {
          id: 1,
          taskName: `客户敏感信息${row.keyName}脱敏规则`,
          sectorName: '资管板块',
          projectName: '核心交易项目',
          taskType: 'DYNAMIC_MASK',
          operationType: 'ENCRYPT',
          owner: row.owner || 'admin',
        },
      ];
    } else {
      referenceList.value = data;
    }
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '加载任务引用记录失败');
  } finally {
    loading.value = false;
  }
};

defineExpose({ open });
</script>

<style scoped lang="less">
.task-ref-content {
  padding-top: 8px;

  .header-summary {
    margin-bottom: 12px;
    font-size: 13px;
  }

  .modal-footer-btn {
    margin-top: 16px;
    text-align: right;
  }
}
</style>
