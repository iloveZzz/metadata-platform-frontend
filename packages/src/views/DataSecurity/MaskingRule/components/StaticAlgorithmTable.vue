<template>
  <div class="static-algorithm-table-box">
    <!-- 筛选及搜索区 -->
    <div class="filter-search-section">
      <div class="search-row">
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="请输入安全算法函数名、中文名称或描述搜索"
          allow-clear
          class="search-input"
          @search="handleSearch"
        />
        <a-space size="middle">
          <a-button type="link" size="small" @click="emit('open-test')">
            <template #icon><ExperimentOutlined /></template>
            安全算法在线测试
          </a-button>
          <a-button type="link" size="small" @click="emit('open-sql')">
            <template #icon><CodeOutlined /></template>
            查看任务 SQL 示例
          </a-button>
        </a-space>
      </div>

      <div class="filter-type-row">
        <div class="flex items-center">
          <span class="type-label">算法分类</span>
          <div class="type-radios">
            <button class="type-pill-btn" :class="{ active: selectedAlgoType === '' }" @click="selectType('')">
              全部
            </button>
            <button class="type-pill-btn" :class="{ active: selectedAlgoType === 'MASK' }" @click="selectType('MASK')">
              遮盖掩码 (MASK)
            </button>
            <button class="type-pill-btn" :class="{ active: selectedAlgoType === 'HASH' }" @click="selectType('HASH')">
              哈希脱敏 (HASH)
            </button>
            <button
              class="type-pill-btn"
              :class="{ active: selectedAlgoType === 'CRYPTO' }"
              @click="selectType('CRYPTO')"
            >
              保留格式加密 (CRYPTO)
            </button>
            <button
              class="type-pill-btn"
              :class="{ active: selectedAlgoType === 'OTHER' }"
              @click="selectType('OTHER')"
            >
              其它 (置空等)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 算法函数列表表格 (YTable) -->
    <div ref="tableRef" class="table-container">
      <YTable
        v-model:pagination="pagination"
        :data="tableData"
        :columns="columns"
        :loading="loading"
        pageable
        :max-height="tableHeight"
        @page-change="handlePageChange"
      >
        <!-- 1. 函数标识列 -->
        <template #functionName="{ row }">
          <div class="func-name-cell">
            <span class="func-code">{{ row.functionName }}</span>
            <span class="func-title">{{ row.displayName }}</span>
          </div>
        </template>

        <!-- 2. 算法分类列 -->
        <template #algorithmType="{ row }">
          <a-tag :color="getTypeMeta(row.algorithmType).color">
            {{ getTypeMeta(row.algorithmType).label }}
          </a-tag>
        </template>

        <!-- 3. 函数签名列 -->
        <template #signature="{ row }">
          <div class="sig-cell">
            <code class="sig-code">{{ row.signature }}</code>
            <a-tooltip title="复制函数签名">
              <a-button type="link" size="small" class="copy-btn" @click="copyText(row.signature)">
                <template #icon><CopyOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </template>

        <!-- 4. 支持引擎列 -->
        <template #supportedEngines="{ row }">
          <a-space size="small" wrap>
            <a-tag v-for="eng in row.supportedEngines || []" :key="eng" class="engine-tag">
              {{ eng }}
            </a-tag>
          </a-space>
        </template>

        <!-- 5. 样例输出列 -->
        <template #sampleOutput="{ row }">
          <span class="sample-out">{{ row.sampleOutput }}</span>
        </template>

        <!-- 6. 操作列 -->
        <template #action="{ row }">
          <a-space size="small">
            <a-button type="link" size="small" @click="emit('test-function', row.functionName)">
              <template #icon><ExperimentOutlined /></template>
              在线测试
            </a-button>
            <a-button type="link" size="small" @click="emit('open-sql', row.functionName)"> SQL 示例 </a-button>
          </a-space>
        </template>
      </YTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { ExperimentOutlined, CodeOutlined, CopyOutlined } from '@ant-design/icons-vue';
import { YTable, type YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { getStaticAlgorithms, type StaticAlgorithmVO } from '@/api/static-masking';

const emit = defineEmits<{
  (e: 'open-test'): void;
  (e: 'open-sql', func?: string): void;
  (e: 'test-function', func: string): void;
}>();

const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

const searchKeyword = ref('');
const selectedAlgoType = ref('');
const loading = ref(false);
const rawList = ref<StaticAlgorithmVO[]>([]);
const tableData = ref<StaticAlgorithmVO[]>([]);

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条脱敏函数`,
});

const columns: YTableColumn[] = [
  { title: '函数标识 / 名称', field: 'functionName', width: 220, slots: { default: 'functionName' } },
  { title: '算法类型', field: 'algorithmType', width: 140, slots: { default: 'algorithmType' } },
  { title: '功能描述', field: 'description', minWidth: 200, showOverflow: true },
  { title: '函数语法签名', field: 'signature', width: 260, slots: { default: 'signature' } },
  { title: '支持计算引擎', field: 'supportedEngines', width: 200, slots: { default: 'supportedEngines' } },
  { title: '脱敏效果样例', field: 'sampleOutput', width: 160, slots: { default: 'sampleOutput' } },
  { title: '操作', field: 'action', width: 170, fixed: 'right', slots: { default: 'action' } },
];

const typeMetaMap: Record<string, { color: string; label: string }> = {
  MASK: { color: 'blue', label: '遮盖掩码' },
  HASH: { color: 'purple', label: '哈希脱敏' },
  CRYPTO: { color: 'green', label: '保留格式加密' },
  OTHER: { color: 'orange', label: '其它' },
};

const getTypeMeta = (type?: string) => {
  return typeMetaMap[type || ''] || { color: 'default', label: type || '遮盖掩码' };
};

const fetchAlgorithms = async () => {
  loading.value = true;
  try {
    const res = await getStaticAlgorithms({
      keyword: searchKeyword.value || undefined,
      algorithmType: selectedAlgoType.value || undefined,
    });
    const list = res.data || [];
    rawList.value = list;
    pagination.value.total = list.length;
    applyPagination();
  } catch {
    rawList.value = [];
    tableData.value = [];
    pagination.value.total = 0;
  } finally {
    loading.value = false;
  }
};

const applyPagination = () => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  tableData.value = rawList.value.slice(start, end);
};

const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
  pagination.value.current = current;
  pagination.value.pageSize = pageSize;
  applyPagination();
};

const selectType = (type: string) => {
  selectedAlgoType.value = type;
  pagination.value.current = 1;
  fetchAlgorithms();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchAlgorithms();
};

const copyText = (text: string) => {
  navigator.clipboard.writeText(text);
  message.success('函数签名已复制');
};

defineExpose({
  fetchList: fetchAlgorithms,
});

onMounted(() => {
  fetchAlgorithms();
});
</script>

<style scoped lang="less">
.static-algorithm-table-box {
  display: flex;
  flex-direction: column;
  height: 100%;

  .filter-search-section {
    padding: 12px 16px;
    background: #fafbfc;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    margin-bottom: 12px;

    .search-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .search-input {
        width: 360px;
      }
    }

    .filter-type-row {
      display: flex;
      align-items: center;

      .type-label {
        font-size: 13px;
        font-weight: 500;
        color: #595959;
        margin-right: 12px;
      }

      .type-radios {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        .type-pill-btn {
          background: #ffffff;
          border: 1px solid #d9d9d9;
          border-radius: 16px;
          padding: 3px 12px;
          font-size: 12px;
          color: #595959;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            color: var(--ant-primary-color, #1677ff);
            border-color: var(--ant-primary-color, #1677ff);
          }

          &.active {
            background: var(--ant-primary-1, #e6f4ff);
            color: var(--ant-primary-color, #1677ff);
            border-color: var(--ant-primary-color, #1677ff);
            font-weight: 500;
          }
        }
      }
    }
  }

  .table-container {
    flex: 1;
    min-height: 0;

    .func-name-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .func-code {
        font-family: 'Fira Code', 'Consolas', monospace;
        font-weight: 600;
        color: var(--ant-primary-color, #1677ff);
        font-size: 13px;
      }

      .func-title {
        font-size: 12px;
        color: #8c8c8c;
      }
    }

    .sig-cell {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .sig-code {
        font-size: 11px;
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        color: #1f2329;
        font-family: monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .copy-btn {
        padding: 0 4px;
        color: #8c8c8c;
        &:hover {
          color: var(--ant-primary-color, #1677ff);
        }
      }
    }

    .engine-tag {
      font-size: 11px;
      background: var(--ant-primary-1, #f0f5ff);
      border-color: var(--ant-primary-2, #adc6ff);
      color: var(--ant-primary-7, #1d39c4);
      border-radius: 3px;
    }

    .sample-out {
      font-family: monospace;
      font-weight: 600;
      color: var(--ant-success-color, #389e0d);
      background: var(--ant-success-1, #f6ffed);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
    }
  }
}
</style>
