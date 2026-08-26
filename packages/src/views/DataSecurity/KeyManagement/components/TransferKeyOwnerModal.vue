<template>
  <a-modal
    v-model:open="visible"
    :title="`转交密钥负责人 - [${currentKey?.keyName || ''}]`"
    :confirm-loading="submitting"
    :width="480"
    @ok="handleOk"
  >
    <div class="transfer-owner-content">
      <a-alert
        v-if="currentKey?.ownerOnly"
        type="info"
        show-icon
        message="仅负责人管理保护"
        description="该密钥开启了【仅负责人管理】，转交后原负责人将失去专属管理权限，请审慎转交。"
        style="margin-bottom: 16px"
      />

      <a-form layout="vertical">
        <a-form-item label="当前负责人">
          <a-input :value="currentKey?.owner" disabled />
        </a-form-item>

        <a-form-item label="新责任人" required>
          <a-select v-model:value="newOwner" placeholder="请选择新的密钥负责人" show-search>
            <a-select-option value="zhangjianteng">zhangjianteng (张建腾 - 安全架构师)</a-select-option>
            <a-select-option value="admin">admin (系统超级管理员)</a-select-option>
            <a-select-option value="sec_admin">sec_admin (数据安全合规管理员)</a-select-option>
            <a-select-option value="liufeng">liufeng (刘峰 - 数据资产专员)</a-select-option>
            <a-select-option value="wangwu">wangwu (王五 - 核心数据研发)</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { KeyManagementItem } from '../hooks/useKeyManagement';

const emit = defineEmits(['success']);
const api = getDataSecurityCenterAPIAPIApi();

const visible = ref(false);
const submitting = ref(false);
const currentKey = ref<KeyManagementItem | null>(null);
const newOwner = ref<string | undefined>(undefined);

const open = (row: KeyManagementItem) => {
  currentKey.value = row;
  newOwner.value = undefined;
  visible.value = true;
};

const handleOk = async () => {
  if (!newOwner.value) {
    message.warning('请选择新的密钥负责人');
    return;
  }
  if (!currentKey.value) return;

  submitting.value = true;
  try {
    await (api as any).transferKeyOwner(currentKey.value.id, {
      newOwner: newOwner.value,
    });
    message.success(`密钥 [${currentKey.value.keyName}] 负责人已成功转交给 ${newOwner.value}`);
    visible.value = false;
    emit('success');
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '转交负责人失败');
  } finally {
    submitting.value = false;
  }
};

defineExpose({ open });
</script>

<style scoped lang="less">
.transfer-owner-content {
  padding-top: 8px;
}
</style>
