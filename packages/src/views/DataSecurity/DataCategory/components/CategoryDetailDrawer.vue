<template>
  <a-drawer v-model:open="visible" title="数据分类详情与特征配置" width="540px" placement="right">
    <div v-if="category" class="category-detail-content">
      <a-descriptions title="基础属性" :column="2" size="small" bordered class="mb-4">
        <a-descriptions-item label="分类名称" :span="2">
          <span class="font-bold text-base text-gray-900">{{ category.categoryName }}</span>
          <a-tag color="geekblue" class="ml-2">{{ category.categoryCode }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="所属目录" :span="2">
          <a-typography-text code>{{ category.treeNodeName || '/ 根目录' }}</a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="绑定安全分级">
          <a-tag :color="getGradeTagColor(category.sensitivityScore)">
            {{ category.securityGradeName || '未定级' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="仲裁优先级">
          <a-tag :color="getPriorityTagColor(category.priority)"> 优先级: {{ category.priority || 3 }} </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="生效状态">
          <a-badge
            :status="category.status === 'ENABLED' ? 'success' : 'default'"
            :text="category.status === 'ENABLED' ? '生效中' : '已停用'"
          />
        </a-descriptions-item>
        <a-descriptions-item label="停用策略">
          {{ category.disablePolicy === 'DELETE_TAGS' ? '同步清除打标' : '保留已有打标' }}
        </a-descriptions-item>
        <a-descriptions-item label="业务描述" :span="2">
          <div class="text-xs text-gray-600">{{ category.description || '无' }}</div>
        </a-descriptions-item>
        <a-descriptions-item label="绑定识别特征" :span="2">
          <div
            v-if="(category as any).recognitionFeatures && (category as any).recognitionFeatures.length"
            class="flex flex-wrap gap-1"
          >
            <a-tag v-for="feat in (category as any).recognitionFeatures" :key="feat" color="blue" class="text-xs">
              {{ feat }}
            </a-tag>
          </div>
          <span v-else class="text-xs text-gray-400">未配置自动扫描特征</span>
        </a-descriptions-item>
      </a-descriptions>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getGradeTagColor } from '@/utils';
import { getPriorityTagColor } from '../constant';
import type { DataCategoryVO } from '@/api/generated/data-security/schemas';

defineOptions({ name: 'CategoryDetailDrawer' });

const props = defineProps<{
  open: boolean;
  category?: DataCategoryVO | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const visible = computed({
  get: () => props.open,
  set: val => emit('update:open', val),
});
</script>
