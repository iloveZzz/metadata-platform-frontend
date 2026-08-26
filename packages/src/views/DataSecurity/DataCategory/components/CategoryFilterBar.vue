<template>
  <div class="category-filter-popover-wrapper">
    <a-popover
      v-model:open="popoverVisible"
      trigger="click"
      placement="bottomRight"
      overlay-class-name="category-filter-popover"
    >
      <template #content>
        <div class="filter-popover-container">
          <div class="popover-header">
            <span class="popover-title">高级筛选</span>
            <a-button type="link" size="small" class="reset-link" @click="handleReset"> 重置 </a-button>
          </div>

          <div class="filter-form">
            <!-- 1. 数据分级 -->
            <div class="form-item">
              <label class="form-label">数据分级</label>
              <a-select
                v-model:value="filter.gradeId"
                allow-clear
                placeholder="全部数据分级"
                class="form-select"
                size="middle"
              >
                <a-select-option value="ALL">全部数据分级</a-select-option>
                <a-select-option v-for="g in gradeList" :key="g.id" :value="String(g.id)">
                  <span class="inline-flex items-center">
                    <a-tag :color="g.colorTag || 'orange'" class="mr-1 text-xs">{{ g.gradeCode }}</a-tag>
                    <span>{{ g.gradeName }}</span>
                  </span>
                </a-select-option>
              </a-select>
            </div>

            <!-- 2. 冲突优先级 -->
            <div class="form-item">
              <label class="form-label">冲突仲裁优先级</label>
              <a-select
                v-model:value="filter.priority"
                allow-clear
                placeholder="全部优先级"
                class="form-select"
                size="middle"
              >
                <a-select-option :value="1">优先级 1 (最高)</a-select-option>
                <a-select-option :value="2">优先级 2 (高)</a-select-option>
                <a-select-option :value="3">优先级 3 (中)</a-select-option>
                <a-select-option :value="4">优先级 4 (低)</a-select-option>
                <a-select-option :value="5">优先级 5 (最低)</a-select-option>
              </a-select>
            </div>

            <!-- 3. 生效状态 -->
            <div class="form-item">
              <label class="form-label">生效状态</label>
              <a-select
                v-model:value="filter.status"
                allow-clear
                placeholder="全部状态"
                class="form-select"
                size="middle"
              >
                <a-select-option value="ALL">全部状态</a-select-option>
                <a-select-option value="ENABLED">仅看生效中</a-select-option>
                <a-select-option value="DISABLED">仅看未生效/已停用</a-select-option>
              </a-select>
            </div>

            <!-- 4. 目录可见范围 -->
            <div class="form-item">
              <label class="form-label">目录可见范围</label>
              <a-select
                v-model:value="filter.visibility"
                allow-clear
                placeholder="全部可见范围"
                class="form-select"
                size="middle"
              >
                <a-select-option value="ALL">全部可见范围</a-select-option>
                <a-select-option value="PUBLIC">公开</a-select-option>
                <a-select-option value="CONFIDENTIAL">机密</a-select-option>
              </a-select>
            </div>

            <!-- 5. 快捷复选 -->
            <div class="form-item checkbox-group">
              <a-checkbox v-model:checked="filter.hasActiveFields">仅看有生效字段</a-checkbox>
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
import type { SecurityGradeVO } from '@/api/generated/data-security/schemas';

export interface CategoryFilterState {
  gradeId?: string;
  priority?: number;
  status?: string;
  visibility?: string;
  hasActiveFields?: boolean;
}

defineOptions({ name: 'CategoryFilterBar' });

const filter = defineModel<CategoryFilterState>('filter', { required: true });

defineProps<{
  gradeList: SecurityGradeVO[];
}>();

const emit = defineEmits<{
  (e: 'change'): void;
}>();

const popoverVisible = ref(false);

const activeFilterCount = computed(() => {
  let count = 0;
  if (filter.value.gradeId && filter.value.gradeId !== 'ALL') count++;
  if (filter.value.priority !== undefined) count++;
  if (filter.value.status && filter.value.status !== 'ALL') count++;
  if (filter.value.visibility && filter.value.visibility !== 'ALL') count++;
  if (filter.value.hasActiveFields) count++;
  return count;
});

const handleReset = () => {
  filter.value.gradeId = undefined;
  filter.value.priority = undefined;
  filter.value.status = undefined;
  filter.value.visibility = undefined;
  filter.value.hasActiveFields = false;
  emit('change');
};

const handleApply = () => {
  popoverVisible.value = false;
  emit('change');
};
</script>

<style scoped lang="less">
.category-filter-popover-wrapper {
  display: inline-block;

  .filter-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 6px;
    color: #475569;

    &:hover {
      color: #2563eb;
      border-color: #2563eb;
    }

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
