<template>
  <a-modal
    :open="visible"
    title="转交脱敏规则负责人"
    :confirm-loading="submitting"
    width="500px"
    @cancel="handleClose"
    @ok="handleTransfer"
  >
    <div class="mb-4">
      <span class="text-gray-600">当前正在转交规则：</span>
      <span class="font-semibold" style="color: var(--ant-primary-color, #1677ff)">
        {{ targetRule ? targetRule.ruleName : '批量选定规则' }}
      </span>
      <div v-if="(targetRule as any)?.owner || (targetRule as any)?.createdBy" class="text-xs text-gray-400 mt-1">
        当前负责人：{{ (targetRule as any)?.owner || (targetRule as any)?.createdBy }}
      </div>
    </div>

    <a-form layout="vertical">
      <a-form-item label="选择新负责人" required>
        <a-select v-model:value="newOwner" placeholder="请选择安全管理员、角色或目录管理员" show-search>
          <a-select-opt-group label="安全管理员">
            <a-select-option value="sec_admin_01">安全管理员 (sec_admin_01)</a-select-option>
            <a-select-option value="sec_admin_02">合规风控官 (sec_admin_02)</a-select-option>
          </a-select-opt-group>
          <a-select-opt-group label="全局自定义角色与目录管理员">
            <a-select-option value="data_owner_personal">个人基本信息目录管理员 (data_owner_personal)</a-select-option>
            <a-select-option value="data_owner_finance">财务资产数据目录管理员 (data_owner_finance)</a-select-option>
            <a-select-option value="audit_role_master">数据安全审计员 (audit_role_master)</a-select-option>
          </a-select-opt-group>
        </a-select>
        <div class="text-xs text-gray-400 mt-1">支持转交给拥有脱敏规则与数据分类管理权限的人员或一级目录管理员</div>
      </a-form-item>

      <a-form-item label="转交备注说明">
        <a-textarea
          v-model:value="comment"
          placeholder="例如：因业务线组织架构调整，统一转交由合规负责人维护"
          :rows="2"
          :maxlength="200"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { customInstance } from '@/api/mutator';
import type { MaskingRuleVO } from '@/api/generated/data-security/schemas';

const props = defineProps<{
  visible: boolean;
  targetRule: MaskingRuleVO | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'success'): void;
}>();

const submitting = ref(false);
const newOwner = ref<string | undefined>(undefined);
const comment = ref('');

watch(
  () => props.visible,
  val => {
    if (val) {
      newOwner.value = undefined;
      comment.value = '';
    }
  }
);

const handleClose = () => {
  emit('update:visible', false);
};

const handleTransfer = async () => {
  if (!newOwner.value) {
    message.warning('请选择新负责人');
    return;
  }
  if (!props.targetRule?.id) {
    message.error('未指定转交目标');
    return;
  }

  submitting.value = true;
  try {
    await customInstance({
      url: '/api/v1/masking-rules/transfer',
      method: 'POST',
      data: {
        ruleIds: [props.targetRule.id],
        newOwner: newOwner.value,
        comment: comment.value,
      },
    });
    message.success(`脱敏规则负责人已成功转交给 [${newOwner.value}]`);
    emit('update:visible', false);
    emit('success');
  } catch (err: any) {
    // handled by mutator
  } finally {
    submitting.value = false;
  }
};
</script>
