<template>
  <a-modal v-model:open="visible" :title="`密钥权限管理 - [${currentKey?.keyName || ''}]`" :footer="null" :width="680">
    <div class="permission-modal-content">
      <div class="top-action-bar">
        <div class="text-xs text-gray-500">管理该密钥的授权成员与角色。授权后可按权限类型使用或维护该密钥。</div>
        <a-button type="primary" size="small" @click="showAddForm = !showAddForm">
          <template #icon><PlusOutlined /></template>
          {{ showAddForm ? '取消新增' : '新增授权' }}
        </a-button>
      </div>

      <!-- 新增授权区域 -->
      <div v-if="showAddForm" class="add-permission-box">
        <a-form layout="inline" :model="addForm">
          <a-form-item label="主体类型">
            <a-select v-model:value="addForm.granteeType" style="width: 100px" size="small">
              <a-select-option value="USER">用户</a-select-option>
              <a-select-option value="ROLE">角色</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="主体标识/名称">
            <a-input
              v-model:value="addForm.granteeName"
              placeholder="如：数据研发部 / zhangsan"
              style="width: 160px"
              size="small"
            />
          </a-form-item>
          <a-form-item label="权限类型">
            <a-select v-model:value="addForm.permissionType" style="width: 100px" size="small">
              <a-select-option value="USE">使用权限</a-select-option>
              <a-select-option value="MANAGE">管理权限</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" size="small" :loading="adding" @click="handleAddPermission"> 确认授予 </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 权限列表表格 -->
      <a-table
        :data-source="permissionList"
        :columns="columns"
        :loading="loading"
        :pagination="false"
        size="small"
        bordered
        row-key="id"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'granteeType'">
            <a-tag :color="text === 'ROLE' ? 'purple' : 'blue'">
              {{ text === 'ROLE' ? '角色' : '用户' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'permissionType'">
            <a-tag :color="text === 'MANAGE' ? 'gold' : 'green'">
              {{ text === 'MANAGE' ? '管理权限' : '使用权限' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-popconfirm
              title="确定回收该主体的密钥使用权限？"
              ok-text="确认回收"
              cancel-text="取消"
              ok-type="danger"
              @confirm="handleRevoke(record)"
            >
              <a-button type="link" danger size="small">回收权限</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>

      <div class="modal-footer-btn">
        <a-button type="primary" @click="visible = false">关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { KeyManagementItem } from '../hooks/useKeyManagement';

const api = getDataSecurityCenterAPIAPIApi();

const visible = ref(false);
const loading = ref(false);
const adding = ref(false);
const showAddForm = ref(false);
const currentKey = ref<KeyManagementItem | null>(null);
const permissionList = ref<any[]>([]);

const addForm = reactive({
  granteeType: 'USER',
  granteeId: '',
  granteeName: '',
  permissionType: 'USE',
});

const columns = [
  {
    title: '主体类型',
    dataIndex: 'granteeType',
    key: 'granteeType',
    width: 90,
    slots: { customRender: 'granteeType' },
  },
  { title: '被授权主体', dataIndex: 'granteeName', key: 'granteeName', minWidth: 140 },
  {
    title: '权限类型',
    dataIndex: 'permissionType',
    key: 'permissionType',
    width: 100,
    slots: { customRender: 'permissionType' },
  },
  { title: '授权人', dataIndex: 'grantedBy', key: 'grantedBy', width: 90 },
  { title: '授权时间', dataIndex: 'grantedAt', key: 'grantedAt', width: 150 },
  { title: '操作', key: 'action', width: 90, align: 'center' as const, slots: { customRender: 'action' } },
];

const fetchPermissions = async () => {
  if (!currentKey.value) return;
  loading.value = true;
  try {
    const res = await (api as any).listKeyPermissions(currentKey.value.id);
    permissionList.value = (res as any)?.data || [];
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '加载权限列表失败');
  } finally {
    loading.value = false;
  }
};

const open = (row: KeyManagementItem) => {
  currentKey.value = row;
  showAddForm.value = false;
  visible.value = true;
  fetchPermissions();
};

const handleAddPermission = async () => {
  if (!addForm.granteeName.trim()) {
    message.warning('请输入主体名称');
    return;
  }
  if (!currentKey.value) return;

  adding.value = true;
  try {
    await (api as any).grantKeyPermission(currentKey.value.id, {
      granteeType: addForm.granteeType,
      granteeId: addForm.granteeId || addForm.granteeName.trim(),
      granteeName: addForm.granteeName.trim(),
      permissionType: addForm.permissionType,
    });
    message.success('权限授权成功');
    addForm.granteeName = '';
    showAddForm.value = false;
    fetchPermissions();
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '授权失败');
  } finally {
    adding.value = false;
  }
};

const handleRevoke = async (record: any) => {
  if (!currentKey.value) return;
  try {
    await (api as any).revokeKeyPermission(currentKey.value.id, record.id);
    message.success('权限已成功回收');
    fetchPermissions();
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '回收权限失败');
  }
};

defineExpose({ open });
</script>

<style scoped lang="less">
.permission-modal-content {
  padding-top: 8px;

  .top-action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .add-permission-box {
    background: #f6ffed;
    border: 1px dashed #b7eb8f;
    border-radius: 4px;
    padding: 10px 12px;
    margin-bottom: 12px;
  }

  .modal-footer-btn {
    margin-top: 16px;
    text-align: right;
  }
}
</style>
