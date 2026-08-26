<script setup lang="ts">
import { computed } from 'vue';
import { YButton, YTable } from '@yss-ui/components';
import { PlusOutlined } from '@ant-design/icons-vue';
import { CONNECTOR_COLUMNS, createConnectorActionConfig, getConnectorStatusMeta } from '../constant';
import type { ConnectorItem, DatasourceCatalogItem } from '../type';

defineOptions({ name: 'ConnectorInstanceDrawer' });

interface Props {
  open: boolean;
  selectedType: DatasourceCatalogItem | null;
  instances: ConnectorItem[];
  testingId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'create', type: DatasourceCatalogItem): void;
  (e: 'edit', row: ConnectorItem): void;
  (e: 'delete', row: ConnectorItem): void;
  (e: 'test', row: ConnectorItem): void;
  (e: 'quick-collect', row: ConnectorItem): void;
}>();

const actionConfig = computed(() =>
  createConnectorActionConfig({
    onEdit: row => emit('edit', row),
    onDelete: row => emit('delete', row),
    onTest: row => emit('test', row),
    isTesting: () => props.testingId !== '',
  })
);

const handleClose = () => {
  emit('update:open', false);
};
</script>

<template>
  <a-drawer
    :open="props.open"
    :title="props.selectedType ? `${props.selectedType.name} - 数据源实例` : '数据源实例'"
    :width="720"
    :destroy-on-close="true"
    @close="handleClose"
  >
    <div v-if="props.selectedType" class="instance-drawer__header">
      <div class="instance-drawer__info">
        <div class="instance-drawer__icon" :style="{ backgroundColor: props.selectedType.brandColor }">
          {{ props.selectedType.logoText }}
        </div>
        <div>
          <div class="instance-drawer__title">{{ props.selectedType.name }}</div>
          <div class="instance-drawer__desc">
            已接入 {{ props.instances.length }} 个实例 · 已采集 {{ props.selectedType.collectedCount ?? 0 }} 项资产 ·
            采集对象：{{ props.selectedType.supportedObjects }}
          </div>
        </div>
      </div>
      <YButton type="primary" @click="emit('create', props.selectedType!)">
        <template #icon><PlusOutlined /></template>
        新增实例
      </YButton>
    </div>

    <div class="instance-drawer__table-wrapper">
      <YTable
        :data="props.instances"
        :columns="CONNECTOR_COLUMNS"
        :action-config="actionConfig"
        :row-config="{ keyField: 'id', useKey: true }"
        :empty-render="{ name: 'AEmpty', props: { description: '当前数据源类型下暂无连接器实例' } }"
      >
        <template #status="{ row }">
          <a-tag :color="getConnectorStatusMeta(row.status).color">
            {{ getConnectorStatusMeta(row.status).label }}
          </a-tag>
        </template>
      </YTable>
    </div>

    <template #footer>
      <div class="instance-drawer__footer">
        <YButton @click="handleClose">关闭</YButton>
      </div>
    </template>
  </a-drawer>
</template>

<style scoped lang="less">
.instance-drawer {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    color: #ffffff;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
    line-height: 1.4;
  }

  &__desc {
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
  }

  &__table-wrapper {
    min-height: 300px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
