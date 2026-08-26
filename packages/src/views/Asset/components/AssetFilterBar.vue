<template>
  <div class="asset-filter-popover-wrapper">
    <a-popover
      v-model:open="popoverVisible"
      trigger="click"
      placement="bottomRight"
      overlay-class-name="asset-filter-popover"
    >
      <template #content>
        <div class="filter-popover-container">
          <div class="popover-header">
            <span class="popover-title">高级筛选</span>
            <a-button type="link" size="small" class="reset-link" @click="handleReset"> 重置 </a-button>
          </div>

          <div class="filter-form">
            <!-- 1. 数据来源 -->
            <div class="form-item">
              <label class="form-label">采集数据源</label>
              <a-select
                v-model:value="filter.source"
                allow-clear
                placeholder="全部数据源"
                :options="props.sourceOptions"
                show-search
                option-filter-prop="label"
                class="form-select"
              />
            </div>

            <!-- 2. 所属数据库 -->
            <div class="form-item">
              <label class="form-label">所属数据库</label>
              <a-input v-model:value="filter.database" allow-clear placeholder="请输入数据库名" class="form-input" />
            </div>

            <!-- 3. 元数据类型 -->
            <div class="form-item">
              <label class="form-label">元数据类型</label>
              <a-select
                v-model:value="filter.type"
                allow-clear
                placeholder="全部类型"
                :options="[
                  { label: '表', value: 'table' },
                  { label: '视图', value: 'view' },
                  { label: '字段', value: 'column' },
                ]"
                class="form-select"
              />
            </div>

            <!-- 4. 所属数据域 -->
            <div class="form-item">
              <label class="form-label">所属数据域</label>
              <a-select
                v-model:value="filter.domain"
                allow-clear
                placeholder="全部数据域"
                :options="props.domainOptions"
                show-search
                option-filter-prop="label"
                class="form-select"
              />
            </div>

            <!-- 5. 分级分类 -->
            <div class="form-item">
              <label class="form-label">分级分类</label>
              <a-select
                v-model:value="filter.classification"
                allow-clear
                placeholder="全部分类"
                :options="[
                  { label: '内部', value: '内部' },
                  { label: '敏感-PII', value: '敏感-PII' },
                  { label: '受限', value: '受限' },
                  { label: '公开', value: '公开' },
                ]"
                class="form-select"
              />
            </div>

            <!-- 6. 快捷标签复选 -->
            <div class="form-item checkbox-group">
              <a-checkbox v-model:checked="filter.mine">我的资产</a-checkbox>
              <a-checkbox v-model:checked="filter.favorite">仅看收藏</a-checkbox>
            </div>
          </div>

          <div class="popover-footer">
            <a-button size="small" @click="popoverVisible = false">取消</a-button>
            <a-button type="primary" size="small" @click="handleApply">确定</a-button>
          </div>
        </div>
      </template>

      <a-badge :count="activeFilterCount" :offset="[-2, 2]">
        <a-button :class="['filter-trigger-btn', { 'is-active': activeFilterCount > 0 }]">
          <template #icon><FilterOutlined /></template>
          筛选
        </a-button>
      </a-badge>
    </a-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { FilterOutlined } from '@ant-design/icons-vue';
import type { AssetFilterState } from '../type';

defineOptions({ name: 'AssetFilterBar' });

const filter = defineModel<AssetFilterState>('filter', { required: true });

const props = defineProps<{
  sourceOptions: { label: string; value: string }[];
  domainOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  (e: 'change'): void;
}>();

const popoverVisible = ref(false);

const activeFilterCount = computed(() => {
  let count = 0;
  if (filter.value.source) count++;
  if (filter.value.database) count++;
  if (filter.value.type) count++;
  if (filter.value.domain) count++;
  if (filter.value.classification) count++;
  if (filter.value.mine) count++;
  if (filter.value.favorite) count++;
  return count;
});

const handleReset = () => {
  filter.value.source = undefined;
  filter.value.database = undefined;
  filter.value.type = undefined;
  filter.value.domain = undefined;
  filter.value.classification = undefined;
  filter.value.mine = false;
  filter.value.favorite = false;
  emit('change');
};

const handleApply = () => {
  popoverVisible.value = false;
  emit('change');
};
</script>

<style scoped lang="less">
.asset-filter-popover-wrapper {
  display: inline-block;

  .filter-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 6px;

    &.is-active {
      color: #2563eb;
      border-color: #2563eb;
      background: #eff6ff;
    }
  }
}

.filter-popover-container {
  width: 280px;
  padding: 4px 0;

  .popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 12px;

    .popover-title {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
    }

    .reset-link {
      padding: 0;
      font-size: 12px;
    }
  }

  .filter-form {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .form-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .form-label {
        font-size: 12px;
        color: #64748b;
      }

      .form-select {
        width: 100%;
      }

      &.checkbox-group {
        flex-direction: row;
        gap: 16px;
        padding-top: 4px;
      }
    }
  }

  .popover-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid #f1f5f9;
  }
}
</style>
