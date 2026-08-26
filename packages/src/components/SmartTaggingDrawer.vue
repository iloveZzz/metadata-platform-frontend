<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity">
    <div class="bg-white w-full max-w-md shadow-2xl h-full flex flex-col p-6 space-y-4">
      <div class="flex justify-between items-center border-b pb-3">
        <div class="flex items-center space-x-2">
          <span class="text-indigo-600 font-bold">✨ 智能打标就地推荐</span>
        </div>
        <button class="text-slate-400 hover:text-slate-600" @click="$emit('close')">✕</button>
      </div>

      <p class="text-xs text-slate-500">大模型结合当前表 Schema 与已配置标签规则自动推导，支持就地采纳入库</p>

      <div class="flex-1 overflow-y-auto space-y-3">
        <div
          v-for="item in suggestions"
          :key="item.columnName"
          class="p-3 bg-slate-50 border rounded-lg space-y-1.5 text-xs"
        >
          <div class="flex justify-between font-bold text-slate-800">
            <span>{{ item.columnName }}</span>
            <span class="text-emerald-600 font-mono">{{ (item.confidence * 100).toFixed(0) }}% 置信度</span>
          </div>
          <div class="text-slate-400">{{ item.columnComment }}</div>
          <div>
            推荐标签:
            <span class="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded">{{ item.recommendedTagName }}</span>
          </div>
        </div>
      </div>

      <div class="border-t pt-3 flex justify-between items-center">
        <span class="text-xs text-slate-500">共 {{ suggestions.length }} 个字段建议</span>
        <button
          class="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700"
          @click="acceptAll"
        >
          全部采纳并入库
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { TagCandidateDTO } from '../api/smartDiscoveryApi';

defineProps<{ visible: boolean }>();
const emit = defineEmits(['close', 'accepted']);

const suggestions = ref<TagCandidateDTO[]>([
  {
    id: 'CAN-01',
    tableName: 'dwd_trade_order_di',
    columnName: 'cust_id_card',
    columnComment: '身份证号',
    recommendedTagId: 'TAG-01',
    recommendedTagName: 'L4 核心敏感数据',
    tagCategory: 'SECURITY',
    source: 'L1_RULE',
    confidence: 0.98,
    status: 'PENDING',
  },
  {
    id: 'CAN-02',
    tableName: 'dwd_trade_order_di',
    columnName: 'trans_amount',
    columnComment: '实际金额',
    recommendedTagId: 'TAG-02',
    recommendedTagName: '零售金融交易域',
    tagCategory: 'DOMAIN',
    source: 'L3_LLM',
    confidence: 0.94,
    status: 'PENDING',
  },
]);

const acceptAll = () => {
  emit('accepted');
  emit('close');
};
</script>
