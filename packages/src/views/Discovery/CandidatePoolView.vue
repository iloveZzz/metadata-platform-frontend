<template>
  <div class="candidate-pool-view p-6 bg-slate-50 min-h-screen">
    <!-- Header & Metric Cards -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-900">智能打标候选池工作台</h1>
      <p class="text-xs text-slate-500 mt-1">
        基于已配置的三层漏斗打标流水线推导的资产标签建议，支持高置信自动生效与人工批量审查
      </p>
    </div>

    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase">待人工审查建议</div>
        <div class="text-2xl font-bold text-amber-600 mt-1">{{ pendingCount }} 条</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase">今日高置信自动生效</div>
        <div class="text-2xl font-bold text-emerald-600 mt-1">{{ autoAppliedCount }} 条</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase">已采纳总数</div>
        <div class="text-2xl font-bold text-blue-600 mt-1">{{ approvedCount }} 条</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-xs font-semibold text-slate-400 uppercase">候选总数</div>
        <div class="text-2xl font-bold text-indigo-600 mt-1">{{ candidates.length }} 条</div>
      </div>
    </div>

    <!-- Actions & Table -->
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div class="flex justify-between items-center">
        <div class="flex space-x-3">
          <select
            v-model="filterStatus"
            class="text-xs border rounded-lg px-3 py-1.5 bg-slate-50"
            @change="fetchCandidates"
          >
            <option value="ALL">全部状态</option>
            <option value="PENDING">待审查</option>
            <option value="AUTO_APPLIED">已自动生效</option>
            <option value="MANUAL_APPROVED">人工已采纳</option>
            <option value="REJECTED">已驳回</option>
          </select>
        </div>

        <div class="flex items-center space-x-2">
          <button
            v-if="selectedIds.length > 0"
            :disabled="actionLoading"
            class="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50"
            @click="handleBatchApprove"
          >
            批量采纳 ({{ selectedIds.length }})
          </button>
          <button
            v-if="selectedIds.length > 0"
            :disabled="actionLoading"
            class="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded hover:bg-rose-700 disabled:opacity-50"
            @click="handleBatchReject"
          >
            批量驳回 ({{ selectedIds.length }})
          </button>
        </div>
      </div>

      <div v-if="loading" class="py-12 text-center text-slate-400 text-xs">加载中...</div>
      <table v-else class="w-full text-left text-xs">
        <thead class="bg-slate-50 border-b text-slate-500 uppercase">
          <tr>
            <th class="p-3 w-8"><input type="checkbox" @change="toggleAll" /></th>
            <th class="p-3">目标表 / 字段</th>
            <th class="p-3">推荐标签</th>
            <th class="p-3">推导来源</th>
            <th class="p-3">置信度</th>
            <th class="p-3">状态</th>
            <th class="p-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody v-if="filteredCandidates.length > 0" class="divide-y divide-slate-100">
          <tr v-for="item in filteredCandidates" :key="item.id" class="hover:bg-slate-50">
            <td class="p-3"><input v-model="selectedIds" type="checkbox" :value="item.id" /></td>
            <td class="p-3">
              <div class="font-bold text-slate-800">{{ item.columnName }}</div>
              <div class="text-[11px] text-slate-400">{{ item.tableName }} · {{ item.columnComment || '—' }}</div>
            </td>
            <td class="p-3">
              <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">{{ item.recommendedTagName }}</span>
            </td>
            <td class="p-3">
              <span v-if="item.source === 'L1_RULE'" class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded"
                >L1 正则</span
              >
              <span v-else-if="item.source === 'L2_DICTIONARY'" class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
                >L2 字典</span
              >
              <span v-else class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">{{ item.source || 'L3 LLM' }}</span>
            </td>
            <td
              class="p-3 font-mono font-bold"
              :class="(item.confidence ?? 0) >= 0.9 ? 'text-emerald-600' : 'text-amber-600'"
            >
              {{ ((item.confidence ?? 0) * 100).toFixed(0) }}%
            </td>
            <td class="p-3">
              <span v-if="item.status === 'PENDING'" class="text-amber-600 font-medium">待审查</span>
              <span v-else-if="item.status === 'AUTO_APPLIED'" class="text-emerald-600 font-medium">已自动生效</span>
              <span v-else-if="item.status === 'MANUAL_APPROVED'" class="text-blue-600 font-medium">已采纳</span>
              <span v-else-if="item.status === 'REJECTED'" class="text-rose-600 font-medium">已驳回</span>
              <span v-else class="text-slate-500 font-medium">{{ item.status }}</span>
            </td>
            <td class="p-3 text-right space-x-2">
              <button
                v-if="item.status === 'PENDING'"
                class="text-blue-600 font-bold hover:underline"
                @click="approveSingle(item)"
              >
                采纳
              </button>
              <button
                v-if="item.status === 'PENDING'"
                class="text-rose-600 hover:underline"
                @click="rejectSingle(item)"
              >
                驳回
              </button>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="7" class="py-8 text-center text-slate-400">暂无匹配的候选打标数据</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  listCandidates,
  batchApproveCandidates,
  batchRejectCandidates,
  type TagCandidateDTO,
} from '@/api/smartDiscoveryApi';

const loading = ref(false);
const actionLoading = ref(false);
const candidates = ref<TagCandidateDTO[]>([]);
const selectedIds = ref<string[]>([]);
const filterStatus = ref('ALL');

const pendingCount = computed(() => candidates.value.filter(c => c.status === 'PENDING').length);
const autoAppliedCount = computed(() => candidates.value.filter(c => c.status === 'AUTO_APPLIED').length);
const approvedCount = computed(() => candidates.value.filter(c => c.status === 'MANUAL_APPROVED').length);

const filteredCandidates = computed(() => {
  return candidates.value.filter(c => filterStatus.value === 'ALL' || c.status === filterStatus.value);
});

const fetchCandidates = async () => {
  loading.value = true;
  try {
    const statusParam = filterStatus.value === 'ALL' ? undefined : filterStatus.value;
    const res = await listCandidates({ status: statusParam });
    candidates.value = res?.data || [];
  } catch (e: any) {
    message.error('加载打标候选池失败');
  } finally {
    loading.value = false;
  }
};

const toggleAll = (e: any) => {
  if (e.target.checked) {
    selectedIds.value = filteredCandidates.value.map(c => c.id);
  } else {
    selectedIds.value = [];
  }
};

const approveSingle = async (item: TagCandidateDTO) => {
  actionLoading.value = true;
  try {
    await batchApproveCandidates([item.id]);
    message.success(`已采纳「${item.columnName}」的标签建议`);
    await fetchCandidates();
  } catch (e) {
    message.error('采纳操作失败');
  } finally {
    actionLoading.value = false;
  }
};

const rejectSingle = async (item: TagCandidateDTO) => {
  actionLoading.value = true;
  try {
    await batchRejectCandidates([item.id]);
    message.success(`已驳回「${item.columnName}」的标签建议`);
    await fetchCandidates();
  } catch (e) {
    message.error('驳回操作失败');
  } finally {
    actionLoading.value = false;
  }
};

const handleBatchApprove = async () => {
  if (!selectedIds.value.length) return;
  actionLoading.value = true;
  try {
    await batchApproveCandidates(selectedIds.value);
    message.success(`成功批量采纳 ${selectedIds.value.length} 条标签建议`);
    selectedIds.value = [];
    await fetchCandidates();
  } catch (e) {
    message.error('批量采纳失败');
  } finally {
    actionLoading.value = false;
  }
};

const handleBatchReject = async () => {
  if (!selectedIds.value.length) return;
  actionLoading.value = true;
  try {
    await batchRejectCandidates(selectedIds.value);
    message.success(`成功批量驳回 ${selectedIds.value.length} 条标签建议`);
    selectedIds.value = [];
    await fetchCandidates();
  } catch (e) {
    message.error('批量驳回失败');
  } finally {
    actionLoading.value = false;
  }
};

onMounted(() => {
  fetchCandidates();
});
</script>
