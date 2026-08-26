<template>
  <a-popover v-model:open="open" trigger="click" placement="bottomRight" overlay-class-name="instance-filter-popover">
    <template #content>
      <div class="filter-panel">
        <div class="filter-panel__header">
          <span class="font-bold">高级筛选</span>
          <a-button type="link" size="small" @click="handleReset">重置</a-button>
        </div>

        <div class="filter-panel__body">
          <!-- 1. 数据源类型 -->
          <div class="filter-group">
            <div class="filter-group__title">数据源类型</div>
            <a-checkbox-group v-model:value="localFilters.datasourceTypes" class="filter-checkbox-grid">
              <a-checkbox v-for="(_, key) in DATASOURCE_TYPE_MAP" :key="key" :value="key">
                {{ key }}
              </a-checkbox>
            </a-checkbox-group>
          </div>

          <!-- 2. 执行方式 -->
          <div class="filter-group">
            <div class="filter-group__title">执行方式</div>
            <a-checkbox-group v-model:value="localFilters.executionModes" class="filter-checkbox-grid">
              <a-checkbox v-for="item in EXECUTION_MODE_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-checkbox>
            </a-checkbox-group>
          </div>

          <!-- 3. 执行状态 -->
          <div class="filter-group">
            <div class="filter-group__title">执行状态</div>
            <a-checkbox-group v-model:value="localFilters.statuses" class="filter-checkbox-grid">
              <a-checkbox v-for="item in INSTANCE_STATUS_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-checkbox>
            </a-checkbox-group>
          </div>

          <!-- 4. 运行时间范围 -->
          <div class="filter-group">
            <div class="filter-group__title">运行时间范围</div>
            <a-range-picker
              v-model:value="dateRangeValue"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 100%"
            />
          </div>
        </div>

        <div class="filter-panel__footer">
          <a-button size="small" @click="open = false">取消</a-button>
          <a-button type="primary" size="small" @click="handleConfirm">确定</a-button>
        </div>
      </div>
    </template>
    <a-button class="filter-btn">
      <FilterOutlined />
      <span>筛选</span>
      <span v-if="activeCount > 0" class="filter-badge">({{ activeCount }})</span>
      <DownOutlined class="down-arrow" />
    </a-button>
  </a-popover>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { FilterOutlined, DownOutlined } from '@ant-design/icons-vue';
import { DATASOURCE_TYPE_MAP, EXECUTION_MODE_OPTIONS, INSTANCE_STATUS_OPTIONS } from '../constant';
import type { CollectorInstanceFilterState } from '../type';

const props = defineProps<{
  filterState: CollectorInstanceFilterState;
}>();

const emit = defineEmits<{
  (e: 'change', val: Partial<CollectorInstanceFilterState>): void;
}>();

const open = ref(false);
const dateRangeValue = ref<[string, string] | undefined>(undefined);

const localFilters = reactive({
  datasourceTypes: [] as string[],
  executionModes: [] as string[],
  statuses: [] as string[],
});

watch(
  () => props.filterState,
  val => {
    localFilters.datasourceTypes = [...val.datasourceTypes];
    localFilters.executionModes = [...val.executionModes];
    localFilters.statuses = [...val.statuses];
    dateRangeValue.value = val.timeRange ? [...val.timeRange] : undefined;
  },
  { deep: true, immediate: true }
);

const activeCount = computed(() => {
  let count =
    props.filterState.datasourceTypes.length +
    props.filterState.executionModes.length +
    props.filterState.statuses.length;
  if (props.filterState.timeRange && props.filterState.timeRange.length === 2) {
    count += 1;
  }
  return count;
});

const handleReset = () => {
  localFilters.datasourceTypes = [];
  localFilters.executionModes = [];
  localFilters.statuses = [];
  dateRangeValue.value = undefined;
  emit('change', {
    datasourceTypes: [],
    executionModes: [],
    statuses: [],
    timeRange: undefined,
  });
  open.value = false;
};

const handleConfirm = () => {
  emit('change', {
    datasourceTypes: [...localFilters.datasourceTypes],
    executionModes: [...localFilters.executionModes],
    statuses: [...localFilters.statuses],
    timeRange: dateRangeValue.value,
  });
  open.value = false;
};
</script>

<style lang="less" scoped>
.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  .down-arrow {
    font-size: 10px;
    margin-left: 2px;
  }
  .filter-badge {
    color: #2563eb;
    font-weight: 500;
  }
}

.filter-panel {
  width: 320px;
  padding: 4px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 380px;
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid #f1f5f9;
    padding-top: 10px;
    margin-top: 10px;
  }
}

.filter-group {
  &__title {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 6px;
  }
}

.filter-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
</style>
