/** * 系统管理页（WU-FE-10，路由 /admin） * RBAC（角色 / 数据域）+
操作审计（只读不可变）；非管理员不可见本入口（WU-FE-11 门禁 + 403 兜底）。 * 仅负责组合 Hooks 与渲染视图模板（≤150
行），业务逻辑见 hooks/。 */
<script setup lang="ts">
import { ref } from 'vue';
import { YButton, YCard, YTable, YssFormily } from '@yss-ui/components';
import { PlusOutlined } from '@ant-design/icons-vue';
import { useUserRole } from '@/hooks/useUserRole';
import PermissionDenied from '@/components/PermissionDenied.vue';
import { useRoleManage } from './hooks/useRoleManage';
import { useAuditLogs } from './hooks/useAuditLogs';
import {
  AUDIT_LOG_COLUMNS,
  ROLE_COLUMNS,
  createRoleActionConfig,
  createRoleFormSchema,
  getAuditResultMeta,
  formatAuditTime,
  hasRefs,
} from './constant';
import type { YssFormilyExpose } from './type';

defineOptions({ name: 'AdminManage' });

const { isAdmin } = useUserRole();

const roleFormRef = ref<YssFormilyExpose>();
const auditAreaRef = ref<HTMLElement>();

const {
  loading: roleLoading,
  loadError: roleLoadError,
  dataList: roleList,
  visible,
  submitting,
  fetchList: fetchRoles,
  openCreate,
  close,
  handleCreate,
  handleDelete,
} = useRoleManage({ formRef: roleFormRef, enabled: () => isAdmin.value });
const {
  loading: auditLoading,
  loadError: auditLoadError,
  dataList: auditList,
  pagination,
  tableHeight: auditHeight,
  fetchList: fetchAudit,
  onPageChange,
} = useAuditLogs({ tableAreaRef: auditAreaRef, enabled: () => isAdmin.value });

const roleActionConfig = createRoleActionConfig({ onDelete: handleDelete });
const roleSchema = createRoleFormSchema();
</script>

<template>
  <div class="admin-page">
    <PermissionDenied v-if="!isAdmin" desc="系统管理由平台管理员管理；当前用户非管理员（X-User-Role seam）" />
    <template v-else>
      <YCard class="admin-page__card" :bordered="false">
        <div class="admin-page__header">
          <div>
            <div class="admin-page__title">系统管理</div>
            <div class="admin-page__desc">RBAC（角色 / 数据域）+ 操作审计；非管理员不可见本入口</div>
          </div>
        </div>

        <a-alert
          v-if="roleLoadError"
          class="admin-page__error"
          type="error"
          show-icon
          message="角色列表加载失败"
          description="请检查网络或稍后重试"
        >
          <template #action>
            <YButton size="small" @click="fetchRoles">重试</YButton>
          </template>
        </a-alert>

        <YCard title="角色与数据域" class="admin-page__zone" :bordered="true">
          <template #extra>
            <YButton type="primary" @click="openCreate">
              <template #icon><PlusOutlined /></template>
              新增角色
            </YButton>
          </template>
          <div class="admin-page__table-area">
            <YTable
              :data="roleList"
              :columns="ROLE_COLUMNS"
              :action-config="roleActionConfig"
              :loading="roleLoading"
              :row-config="{ keyField: 'id', useKey: true }"
            >
              <template #refs="{ row }">
                <a-tag :color="hasRefs(row.refs) ? 'warning' : 'default'">{{ row.refs ?? '0' }}</a-tag>
              </template>
            </YTable>
          </div>
        </YCard>

        <YCard title="审计日志（只读不可变）" class="admin-page__zone" :bordered="true">
          <a-alert v-if="auditLoadError" class="admin-page__error" type="error" show-icon message="审计日志加载失败">
            <template #action>
              <YButton size="small" @click="fetchAudit">重试</YButton>
            </template>
          </a-alert>
          <div ref="auditAreaRef" class="admin-page__table-area">
            <YTable
              v-model:pagination="pagination"
              :data="auditList"
              :columns="AUDIT_LOG_COLUMNS"
              :loading="auditLoading"
              :height="auditHeight"
              :row-config="{ keyField: 'id', useKey: true }"
              pageable
              @page-change="onPageChange"
            >
              <template #result="{ row }">
                <a-tag :color="getAuditResultMeta(row.result).color">{{ getAuditResultMeta(row.result).label }}</a-tag>
              </template>
              <template #time="{ row }">{{ formatAuditTime(row.time) }}</template>
            </YTable>
          </div>
        </YCard>
      </YCard>

      <a-modal
        v-model:open="visible"
        title="新增角色"
        :width="480"
        :destroy-on-close="true"
        @ok="handleCreate"
        @cancel="close"
      >
        <YssFormily ref="roleFormRef" :schema="roleSchema" :initial-values="{ domains: [] }" />
        <template #footer>
          <div class="admin-page__drawer-footer">
            <YButton :loading="submitting" type="primary" @click="handleCreate">创建</YButton>
            <YButton :disabled="submitting" @click="close">取消</YButton>
          </div>
        </template>
      </a-modal>
    </template>
  </div>
</template>

<style scoped lang="less">
@import './style.less';
</style>
