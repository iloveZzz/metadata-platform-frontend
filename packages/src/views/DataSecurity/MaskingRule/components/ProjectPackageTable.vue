<template>
  <div class="project-package-table-box">
    <!-- 筛选及搜索区 -->
    <div class="filter-search-section">
      <div class="search-row">
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="请输入项目名称或项目编码搜索"
          allow-clear
          class="search-input"
          @search="handleSearch"
        />
        <a-space size="middle">
          <a-radio-group v-model:value="selectedStatus" button-style="solid" @change="handleSearch">
            <a-radio-button value="">全部状态</a-radio-button>
            <a-radio-button value="INSTALLED">已安装</a-radio-button>
            <a-radio-button value="UPGRADABLE">可升级</a-radio-button>
            <a-radio-button value="NOT_INSTALLED">未安装</a-radio-button>
          </a-radio-group>
          <a-button type="primary" @click="emit('open-install')">
            <template #icon><AppstoreAddOutlined /></template>
            安装算法包
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 表格区域 (YTable) -->
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
        <!-- 1. 项目名称与编码列 -->
        <template #projectName="{ row }">
          <div class="proj-cell">
            <span class="proj-name">{{ row.projectName }}</span>
            <span class="proj-code">{{ row.projectCode }}</span>
          </div>
        </template>

        <!-- 2. 计算引擎列 -->
        <template #engineType="{ row }">
          <a-tag color="cyan">{{ row.engineType }}</a-tag>
        </template>

        <!-- 3. 算法包版本列 -->
        <template #packageVersion="{ row }">
          <span v-if="row.packageVersion !== '-'" class="version-tag">
            {{ row.packageVersion }}
          </span>
          <span v-else style="color: #bfbfbf">-</span>
        </template>

        <!-- 4. 安装状态列 -->
        <template #status="{ row }">
          <a-badge
            :status="row.status === 'INSTALLED' ? 'success' : row.status === 'UPGRADABLE' ? 'warning' : 'default'"
            :text="
              row.status === 'INSTALLED' ? '已安装生效' : row.status === 'UPGRADABLE' ? '有新版本可升级' : '未安装'
            "
          />
        </template>

        <!-- 5. 授权函数数列 -->
        <template #authorizedCount="{ row }">
          <a-popover v-if="row.authorizedCount > 0" title="已授权脱敏安全函数" placement="left">
            <template #content>
              <div class="pop-func-list">
                <a-tag
                  v-for="f in row.authorizedFunctions || [
                    'sec_mask_phone',
                    'sec_mask_idcard',
                    'sec_mask_name',
                    'sec_mask_bankcard',
                    'sec_mask_email',
                    'sec_hash_sha256',
                    'sec_crypto_fpe',
                    'sec_mask_custom',
                  ]"
                  :key="f"
                  class="pop-func-tag"
                >
                  {{ f }}
                </a-tag>
              </div>
            </template>
            <a class="auth-count-link">
              {{ row.authorizedCount }} 个安全函数
              <EyeOutlined style="margin-left: 4px; font-size: 11px" />
            </a>
          </a-popover>
          <span v-else style="color: #bfbfbf">无授权</span>
        </template>

        <!-- 6. 操作列 -->
        <template #action="{ row }">
          <a-space size="small">
            <a-button
              v-if="row.status === 'NOT_INSTALLED'"
              type="link"
              size="small"
              @click="emit('open-install', row.projectId)"
            >
              安装算法包
            </a-button>
            <a-button
              v-else-if="row.status === 'UPGRADABLE'"
              type="link"
              size="small"
              style="color: var(--ant-warning-color, #fa8c16)"
              @click="emit('open-install', row.projectId)"
            >
              立即升级
            </a-button>
            <a-button v-else type="link" size="small" @click="emit('open-install', row.projectId)"> 重新配置 </a-button>
            <a-button type="link" size="small" @click="showAuthorizedModal(row)"> 授权明细 </a-button>
          </a-space>
        </template>
      </YTable>
    </div>

    <!-- 查看授权函数清单弹窗 -->
    <a-modal
      v-model:open="authModalVisible"
      :title="`[${selectedProject?.projectName || '项目'}] 已授权算法函数明细`"
      :footer="null"
      width="540px"
    >
      <div class="auth-detail-box">
        <div class="auth-summary-row">
          <span
            >项目计算引擎: <strong>{{ selectedProject?.engineType }}</strong></span
          >
          <span
            >当前算法包版本: <strong>{{ selectedProject?.packageVersion }}</strong></span
          >
        </div>
        <div class="auth-chips-grid">
          <a-tag
            v-for="fn in selectedProject?.authorizedFunctions || defaultFunctions"
            :key="fn"
            color="blue"
            class="detail-chip"
          >
            {{ fn }}
          </a-tag>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { AppstoreAddOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { YTable, type YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { getProjectPackages, type ProjectPackageVO } from '@/api/static-masking';

const emit = defineEmits<{
  (e: 'open-install', projectId?: string): void;
}>();

const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

const searchKeyword = ref('');
const selectedStatus = ref('');
const loading = ref(false);
const rawList = ref<ProjectPackageVO[]>([]);
const tableData = ref<ProjectPackageVO[]>([]);

const authModalVisible = ref(false);
const selectedProject = ref<ProjectPackageVO | null>(null);

const defaultFunctions = [
  'sec_mask_phone',
  'sec_mask_idcard',
  'sec_mask_name',
  'sec_mask_bankcard',
  'sec_mask_email',
  'sec_hash_sha256',
  'sec_hash_md5',
  'sec_crypto_fpe',
  'sec_mask_custom',
  'sec_mask_null',
];

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 个计算项目`,
});

const columns: YTableColumn[] = [
  { title: '项目名称 / 标识', field: 'projectName', minWidth: 180, slots: { default: 'projectName' } },
  { title: '计算引擎', field: 'engineType', width: 160, slots: { default: 'engineType' } },
  { title: '算法包版本', field: 'packageVersion', width: 150, slots: { default: 'packageVersion' } },
  { title: '安装状态', field: 'status', width: 150, slots: { default: 'status' } },
  { title: '可用函数', field: 'authorizedCount', width: 140, slots: { default: 'authorizedCount' } },
  { title: '安装 / 更新时间', field: 'installedAt', width: 160 },
  { title: '操作', field: 'action', width: 160, fixed: 'right', slots: { default: 'action' } },
];

const fetchPackages = async () => {
  loading.value = true;
  try {
    const res = await getProjectPackages({
      keyword: searchKeyword.value || undefined,
      status: selectedStatus.value || undefined,
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

const handleSearch = () => {
  pagination.value.current = 1;
  fetchPackages();
};

const showAuthorizedModal = (row: ProjectPackageVO) => {
  selectedProject.value = row;
  authModalVisible.value = true;
};

defineExpose({
  fetchList: fetchPackages,
});

onMounted(() => {
  fetchPackages();
});
</script>

<style scoped lang="less">
.project-package-table-box {
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

      .search-input {
        width: 320px;
      }
    }
  }

  .table-container {
    flex: 1;
    min-height: 0;

    .proj-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .proj-name {
        font-weight: 600;
        color: #262626;
        font-size: 13px;
      }

      .proj-code {
        font-size: 12px;
        color: #8c8c8c;
        font-family: monospace;
      }
    }

    .version-tag {
      font-family: monospace;
      font-weight: 600;
      color: var(--ant-primary-color, #0958d9);
      background: var(--ant-primary-1, #e6f4ff);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .auth-count-link {
      color: var(--ant-success-color, #389e0d);
      font-weight: 500;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .pop-func-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
    width: 180px;

    .pop-func-tag {
      font-family: monospace;
      margin-right: 0;
    }
  }

  .auth-detail-box {
    .auth-summary-row {
      display: flex;
      justify-content: space-between;
      background: #fafbfc;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 12px;
    }

    .auth-chips-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .detail-chip {
        font-family: monospace;
        font-size: 12px;
        padding: 4px 8px;
      }
    }
  }
}
</style>
