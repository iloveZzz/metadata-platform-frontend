<template>
  <div class="key-management-page">
    <YCard class-name="main-table-card">
      <!-- 顶部 Header 栏：标题与右侧组合操作区 (1:1 原型对齐) -->
      <div class="page-top-bar">
        <div class="page-title-wrap">
          <span class="main-title">密钥管理</span>
        </div>

        <div class="top-filter-actions">
          <!-- ① '我的' 复选框 -->
          <div class="mine-checkbox-wrap">
            <a-checkbox v-model:checked="searchParams.isMine" @change="onSearch"> 我的 </a-checkbox>
          </div>

          <!-- 搜索输入框 -->
          <div class="search-input-wrap">
            <a-input-search
              v-model:value="searchParams.keyword"
              placeholder="请输入密钥名或描述"
              style="width: 220px"
              allow-clear
              @search="onSearch"
              @press-enter="onSearch"
            />
          </div>

          <!-- 漏斗高级筛选 Popover -->
          <a-popover v-model:open="filterPopoverOpen" title="高级筛选" trigger="click" placement="bottomRight">
            <template #content>
              <div class="filter-popover-content">
                <a-form layout="vertical" :model="searchParams">
                  <a-form-item label="密钥类型">
                    <a-select
                      v-model:value="searchParams.keyType"
                      placeholder="全部类型"
                      allow-clear
                      style="width: 200px"
                    >
                      <a-select-option value="HASH">哈希脱敏密钥 (HASH)</a-select-option>
                      <a-select-option value="ENCRYPTION">加解密密钥 (ENCRYPTION)</a-select-option>
                    </a-select>
                  </a-form-item>

                  <a-form-item label="加解密算法">
                    <a-select
                      v-model:value="searchParams.algorithm"
                      placeholder="全部算法"
                      allow-clear
                      style="width: 200px"
                    >
                      <a-select-option value="AES">AES</a-select-option>
                      <a-select-option value="DES">DES</a-select-option>
                      <a-select-option value="3DES">3DES</a-select-option>
                      <a-select-option value="SM4">SM4 (国密)</a-select-option>
                      <a-select-option value="SM2">SM2 (国密)</a-select-option>
                      <a-select-option value="RSA">RSA / PSA</a-select-option>
                      <a-select-option value="FF1">FPE (FF1)</a-select-option>
                    </a-select>
                  </a-form-item>

                  <a-form-item label="生成方式">
                    <a-select
                      v-model:value="searchParams.genType"
                      placeholder="全部方式"
                      allow-clear
                      style="width: 200px"
                    >
                      <a-select-option value="SYSTEM">系统生成</a-select-option>
                      <a-select-option value="CUSTOM">自定义</a-select-option>
                    </a-select>
                  </a-form-item>

                  <a-form-item label="负责人">
                    <a-input
                      v-model:value="searchParams.owner"
                      placeholder="输入负责人姓名/账号"
                      allow-clear
                      style="width: 200px"
                    />
                  </a-form-item>

                  <div class="popover-footer-actions">
                    <a-button size="small" @click="handleFilterReset">重置</a-button>
                    <a-button type="primary" size="small" @click="handleFilterConfirm">确定</a-button>
                  </div>
                </a-form>
              </div>
            </template>
            <a-button class="icon-action-btn" :type="hasActiveFilters ? 'primary' : 'default'" ghost>
              <template #icon><FilterOutlined /></template>
            </a-button>
          </a-popover>

          <!-- ② 说明按钮 -->
          <a-button class="help-btn" @click="openHelpDrawer">
            <template #icon><QuestionCircleOutlined /></template>
            说明
          </a-button>

          <!-- 注册密钥 主按钮 -->
          <YButton type="primary" @click="openCreateModal"> 注册密钥 </YButton>

          <!-- 刷新按钮 -->
          <a-button class="icon-action-btn" @click="fetchList">
            <template #icon><ReloadOutlined /></template>
          </a-button>
        </div>
      </div>

      <!-- ③ 密钥列表表格 (YTable) -->
      <div ref="tableRef" class="table-container">
        <YTable
          :data="tableData"
          :columns="columns"
          :loading="loading"
          pageable
          :pagination="pagination"
          :max-height="tableHeight"
          @page-change="handlePageChange"
        >
          <!-- 密钥名称列 (带蓝色钥匙图标与名称) -->
          <template #keyName="{ row }">
            <div class="key-name-cell">
              <div class="key-icon-badge">
                <KeyOutlined />
              </div>
              <div class="key-name-info">
                <span class="name-text">{{ row.keyName }}</span>
                <span v-if="row.ownerOnly" class="owner-only-tag">仅负责人</span>
              </div>
            </div>
          </template>

          <!-- 密钥类型列 -->
          <template #keyType="{ row }">
            <span>{{ row.keyType === 'HASH' ? '哈希脱敏密钥' : '加解密密钥' }}</span>
          </template>

          <!-- 加解密算法列 -->
          <template #algorithm="{ row }">
            <span v-if="row.keyType === 'HASH' || !row.algorithm || row.algorithm === '-'">-</span>
            <a-tag v-else :color="getAlgorithmTagColor(row.algorithm)">
              {{ row.algorithm }} {{ row.keyLength ? `(${row.keyLength}位)` : '' }}
            </a-tag>
          </template>

          <!-- 生成方式列 -->
          <template #genType="{ row }">
            <span>{{ row.genType === 'CUSTOM' ? '自定义' : '系统生成' }}</span>
          </template>

          <!-- 操作列 -->
          <template #action="{ row }">
            <div class="table-action-cell">
              <!-- 查看密钥明文值 (高危) -->
              <a-tooltip title="查看密钥值 (生成审计日志)">
                <a-button type="text" size="small" class="action-icon-btn" @click="openRevealModal(row)">
                  <EyeOutlined />
                </a-button>
              </a-tooltip>

              <!-- 任务引用记录 -->
              <a-tooltip title="任务引用记录">
                <a-button type="text" size="small" class="action-icon-btn" @click="openTaskRefModal(row)">
                  <FileTextOutlined />
                </a-button>
              </a-tooltip>

              <!-- 权限管理 -->
              <a-tooltip title="权限管理">
                <a-button type="text" size="small" class="action-icon-btn" @click="openPermissionModal(row)">
                  <SafetyCertificateOutlined />
                </a-button>
              </a-tooltip>

              <!-- 更多下拉操作 (编辑、转交、删除) -->
              <a-dropdown :trigger="['click']">
                <a-button type="text" size="small" class="action-icon-btn">
                  <MoreOutlined />
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="openEditModal(row)">
                      <EditOutlined style="margin-right: 6px" />
                      编辑密钥
                    </a-menu-item>
                    <a-menu-item @click="openTransferModal(row)">
                      <SwapOutlined style="margin-right: 6px" />
                      转交责任人
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item danger @click="confirmDelete(row)">
                      <DeleteOutlined style="margin-right: 6px" />
                      删除密钥
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </template>
        </YTable>
      </div>
    </YCard>

    <!-- 配套弹窗与抽屉 -->
    <KeyHelpDrawer ref="helpDrawerRef" />
    <KeySecretModal ref="secretModalRef" @success="fetchList" />
    <KeySecretRevealModal ref="revealModalRef" />
    <KeyTaskRefModal ref="taskRefModalRef" />
    <KeyPermissionModal ref="permissionModalRef" />
    <TransferKeyOwnerModal ref="transferModalRef" @success="fetchList" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Modal } from 'ant-design-vue';
import {
  KeyOutlined,
  FilterOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  MoreOutlined,
  EditOutlined,
  SwapOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import { YCard, YButton, YTable, type YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';
import { useKeyManagement, type KeyManagementItem } from './hooks/useKeyManagement';

import KeyHelpDrawer from './components/KeyHelpDrawer.vue';
import KeySecretModal from './components/KeySecretModal.vue';
import KeySecretRevealModal from './components/KeySecretRevealModal.vue';
import KeyTaskRefModal from './components/KeyTaskRefModal.vue';
import KeyPermissionModal from './components/KeyPermissionModal.vue';
import TransferKeyOwnerModal from './components/TransferKeyOwnerModal.vue';
import './style.less';

defineOptions({ name: 'DataSecKeyManagement' });

const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

const { loading, tableData, searchParams, pagination, fetchList, onSearch, handlePageChange, handleDelete } =
  useKeyManagement();

const filterPopoverOpen = ref(false);
const helpDrawerRef = ref();
const secretModalRef = ref();
const revealModalRef = ref();
const taskRefModalRef = ref();
const permissionModalRef = ref();
const transferModalRef = ref();

const hasActiveFilters = computed(() => {
  return !!(searchParams.keyType || searchParams.algorithm || searchParams.genType || searchParams.owner);
});

const columns: YTableColumn[] = [
  { title: '密钥名称', field: 'keyName', minWidth: 200, slots: { default: 'keyName' } },
  { title: '密钥类型', field: 'keyType', width: 140, slots: { default: 'keyType' } },
  { title: '加解密算法', field: 'algorithm', width: 150, slots: { default: 'algorithm' } },
  { title: '生成方式', field: 'genType', width: 110, slots: { default: 'genType' } },
  { title: '负责人', field: 'owner', width: 120 },
  { title: '创建时间', field: 'createdAt', width: 170 },
  { title: '密钥描述', field: 'description', minWidth: 220, showOverflow: true },
  { title: '操作', field: 'action', width: 140, align: 'center', fixed: 'right', slots: { default: 'action' } },
];

const getAlgorithmTagColor = (algo?: string) => {
  if (!algo) return 'default';
  const u = algo.toUpperCase();
  if (u.includes('SM4') || u.includes('SM2')) return 'cyan';
  if (u.includes('AES')) return 'blue';
  if (u.includes('RSA') || u.includes('PSA')) return 'purple';
  if (u.includes('FF1') || u.includes('FPE')) return 'green';
  if (u.includes('DES')) return 'orange';
  return 'geekblue';
};

const handleFilterConfirm = () => {
  filterPopoverOpen.value = false;
  onSearch();
};

const handleFilterReset = () => {
  searchParams.keyType = undefined;
  searchParams.algorithm = undefined;
  searchParams.genType = undefined;
  searchParams.owner = undefined;
  filterPopoverOpen.value = false;
  onSearch();
};

const openHelpDrawer = () => {
  helpDrawerRef.value?.open();
};

const openCreateModal = () => {
  secretModalRef.value?.open();
};

const openEditModal = (row: KeyManagementItem) => {
  secretModalRef.value?.open(row);
};

const openRevealModal = (row: KeyManagementItem) => {
  revealModalRef.value?.open(row);
};

const openTaskRefModal = (row: KeyManagementItem) => {
  taskRefModalRef.value?.open(row);
};

const openPermissionModal = (row: KeyManagementItem) => {
  permissionModalRef.value?.open(row);
};

const openTransferModal = (row: KeyManagementItem) => {
  transferModalRef.value?.open(row);
};

const confirmDelete = (row: KeyManagementItem) => {
  Modal.confirm({
    title: '确认删除密钥',
    content: `确定要删除密钥 [${row.keyName}] 吗？若当前密钥已经被任务或脱敏规则引用，删除可能导致现有任务出错。`,
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: () => handleDelete(row),
  });
};
</script>
