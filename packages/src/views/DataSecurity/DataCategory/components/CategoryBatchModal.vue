<template>
  <div>
    <!-- 批量移动目录 Modal -->
    <a-modal v-model:open="moveVisible" title="批量移动分类至目标目录" width="440px" @ok="handleMoveOk">
      <div class="py-2">
        <p class="text-xs text-gray-500 mb-2">
          已选择 <strong>{{ selectedCount }}</strong> 个数据分类，请选择要移动至的目标目录节点：
        </p>
        <a-tree-select
          v-model:value="targetNodeId"
          :tree-data="treeData"
          :field-names="{ label: 'nodeName', value: 'id', children: 'children' }"
          placeholder="请选择目标目录节点"
          style="width: 100%"
          allow-clear
          tree-default-expand-all
        />
      </div>
    </a-modal>

    <!-- 批量指定分级 Modal -->
    <a-modal v-model:open="gradeVisible" title="批量指定数据安全分级" width="440px" @ok="handleGradeOk">
      <div class="py-2">
        <p class="text-xs text-gray-500 mb-2">
          已选择 <strong>{{ selectedCount }}</strong> 个数据分类，请选择要统一绑定的数据安全分级：
        </p>
        <a-select v-model:value="targetGradeId" placeholder="请选择目标安全分级" style="width: 100%">
          <a-select-option v-for="g in gradeList" :key="g.id" :value="g.id">
            <a-tag :color="g.colorTag || 'blue'">{{ g.gradeCode }}</a-tag> {{ g.gradeName }}
          </a-select-option>
        </a-select>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { SecurityGradeVO, CategoryTreeNodeVO } from '@/api/generated/data-security/schemas';

const props = defineProps<{
  moveOpen: boolean;
  gradeOpen: boolean;
  selectedCount: number;
  treeData: CategoryTreeNodeVO[];
  gradeList: SecurityGradeVO[];
}>();

const emit = defineEmits<{
  (e: 'update:moveOpen', val: boolean): void;
  (e: 'update:gradeOpen', val: boolean): void;
  (e: 'move', targetNodeId: number): void;
  (e: 'grade', targetGradeId: number): void;
}>();

const moveVisible = computed({
  get: () => props.moveOpen,
  set: val => emit('update:moveOpen', val),
});

const gradeVisible = computed({
  get: () => props.gradeOpen,
  set: val => emit('update:gradeOpen', val),
});

const targetNodeId = ref<number | undefined>();
const targetGradeId = ref<number | undefined>();

const handleMoveOk = () => {
  if (!targetNodeId.value) {
    message.warning('请选择目标目录节点');
    return;
  }
  emit('move', targetNodeId.value);
};

const handleGradeOk = () => {
  if (!targetGradeId.value) {
    message.warning('请选择目标安全分级');
    return;
  }
  emit('grade', targetGradeId.value);
};
</script>
