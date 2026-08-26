<template>
  <a-popover
    v-model:open="visible"
    trigger="click"
    placement="bottomRight"
    overlay-class-name="recognition-filter-popover"
  >
    <template #content>
      <div class="filter-panel">
        <div class="filter-panel__header">
          <span class="title">高级筛选</span>
          <a-button type="link" size="small" @click="handleReset">重置</a-button>
        </div>

        <div class="filter-panel__body">
          <!-- 数据分级多选 -->
          <div class="filter-item">
            <span class="label">数据分级</span>
            <a-checkbox-group v-model:value="localFilter.gradeList" class="grade-checkbox-group">
              <a-checkbox value="1">L1</a-checkbox>
              <a-checkbox value="2">L2</a-checkbox>
              <a-checkbox value="3">L3</a-checkbox>
              <a-checkbox value="4">L4</a-checkbox>
              <a-checkbox value="5">L5</a-checkbox>
            </a-checkbox-group>
          </div>

          <!-- 资产来源类型 -->
          <div class="filter-item">
            <span class="label">资产来源</span>
            <a-radio-group v-model:value="localFilter.assetSourceType" size="small" button-style="solid">
              <a-radio-button value="">全部</a-radio-button>
              <a-radio-button value="DATAPHIN">Dataphin表</a-radio-button>
              <a-radio-button value="DATASOURCE">数据源表</a-radio-button>
            </a-radio-group>
          </div>

          <!-- 脱敏生效状态 -->
          <div class="filter-item">
            <span class="label">脱敏生效状态</span>
            <a-radio-group v-model:value="localFilter.maskingStatus" size="small" button-style="solid">
              <a-radio-button value="">全部</a-radio-button>
              <a-radio-button value="ENABLED">生效</a-radio-button>
              <a-radio-button value="DISABLED">失效</a-radio-button>
            </a-radio-group>
          </div>

          <!-- 识别方式 -->
          <div class="filter-item">
            <span class="label">识别方式</span>
            <a-select
              v-model:value="localFilter.recognitionMethod"
              placeholder="全部方式"
              size="small"
              allow-clear
              style="width: 100%"
            >
              <a-select-option value="AUTO">自动识别</a-select-option>
              <a-select-option value="MANUAL">手动指定</a-select-option>
              <a-select-option value="LINEAGE">基于血缘自动继承</a-select-option>
            </a-select>
          </div>

          <!-- 锁定状态 -->
          <div class="filter-item">
            <span class="label">锁定状态</span>
            <a-radio-group v-model:value="localFilter.isLocked" size="small" button-style="solid">
              <a-radio-button :value="undefined">全部</a-radio-button>
              <a-radio-button :value="true">已锁定</a-radio-button>
              <a-radio-button :value="false">未锁定</a-radio-button>
            </a-radio-group>
          </div>

          <!-- 是否有更优推荐 -->
          <div class="filter-item">
            <span class="label">推荐提示</span>
            <a-checkbox v-model:checked="localFilter.hasBetterRecommendation"> 仅看有更优推荐结果 </a-checkbox>
          </div>
        </div>

        <div class="filter-panel__footer">
          <a-button size="small" @click="visible = false">取消</a-button>
          <a-button type="primary" size="small" @click="handleApply">确定</a-button>
        </div>
      </div>
    </template>

    <a-button :type="hasActiveFilter ? 'primary' : 'default'">
      <template #icon><FilterOutlined /></template>
      筛选
      <span v-if="hasActiveFilter" class="filter-dot" />
    </a-button>
  </a-popover>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { FilterOutlined } from '@ant-design/icons-vue';

interface FilterState {
  securityGradeId?: number;
  gradeList?: string[];
  assetSourceType?: string;
  maskingStatus?: string;
  recognitionMethod?: string;
  isLocked?: boolean;
  hasBetterRecommendation?: boolean;
}

const props = defineProps<{
  filter: FilterState;
}>();

const emit = defineEmits<{
  (e: 'update:filter', val: FilterState): void;
  (e: 'change'): void;
}>();

const visible = ref(false);

const localFilter = reactive<FilterState>({
  gradeList: props.filter.securityGradeId ? [String(props.filter.securityGradeId)] : [],
  assetSourceType: props.filter.assetSourceType || '',
  maskingStatus: props.filter.maskingStatus || '',
  recognitionMethod: props.filter.recognitionMethod || undefined,
  isLocked: props.filter.isLocked,
  hasBetterRecommendation: props.filter.hasBetterRecommendation || false,
});

watch(
  () => props.filter,
  val => {
    localFilter.assetSourceType = val.assetSourceType || '';
    localFilter.maskingStatus = val.maskingStatus || '';
    localFilter.recognitionMethod = val.recognitionMethod || undefined;
    localFilter.isLocked = val.isLocked;
    localFilter.hasBetterRecommendation = val.hasBetterRecommendation || false;
    if (val.securityGradeId) {
      localFilter.gradeList = [String(val.securityGradeId)];
    }
  },
  { deep: true }
);

const hasActiveFilter = computed(() => {
  return (
    (localFilter.gradeList && localFilter.gradeList.length > 0) ||
    !!localFilter.assetSourceType ||
    !!localFilter.maskingStatus ||
    !!localFilter.recognitionMethod ||
    localFilter.isLocked !== undefined ||
    !!localFilter.hasBetterRecommendation
  );
});

const handleReset = () => {
  localFilter.gradeList = [];
  localFilter.assetSourceType = '';
  localFilter.maskingStatus = '';
  localFilter.recognitionMethod = undefined;
  localFilter.isLocked = undefined;
  localFilter.hasBetterRecommendation = false;
};

const handleApply = () => {
  const selectedGradeId =
    localFilter.gradeList && localFilter.gradeList.length > 0 ? Number(localFilter.gradeList[0]) : undefined;
  emit('update:filter', {
    securityGradeId: selectedGradeId,
    assetSourceType: localFilter.assetSourceType || undefined,
    maskingStatus: localFilter.maskingStatus || undefined,
    recognitionMethod: localFilter.recognitionMethod || undefined,
    isLocked: localFilter.isLocked,
    hasBetterRecommendation: localFilter.hasBetterRecommendation || undefined,
  });
  emit('change');
  visible.value = false;
};
</script>

<style lang="less" scoped>
.filter-panel {
  width: 320px;
  padding: 6px 8px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color-split, #f0f0f0);

    .title {
      font-weight: 600;
      color: var(--heading-color, #262626);
    }
  }

  &__body {
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .label {
        font-size: 12px;
        color: var(--text-color-secondary, #8c8c8c);
      }

      .grade-checkbox-group {
        display: flex;
        gap: 8px;
      }
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color-split, #f0f0f0);
  }
}

.filter-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--error-color, #ff4d4f);
  margin-left: 4px;
}
</style>
