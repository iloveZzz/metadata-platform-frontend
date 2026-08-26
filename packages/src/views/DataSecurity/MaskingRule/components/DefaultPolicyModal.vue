<template>
  <a-modal
    :open="visible"
    title="默认脱敏策略配置"
    :confirm-loading="saving"
    width="560px"
    @cancel="handleClose"
    @ok="handleSave"
  >
    <a-alert
      type="info"
      show-icon
      message="默认脱敏策略说明"
      description="默认脱敏策略即默认的敏感数据保护策略，可统一为没有单独脱敏规则的敏感数据提供托底安全保护。仅安全管理员有权调整。"
      class="mb-4"
    />

    <a-form layout="vertical">
      <a-form-item label="触发脱敏的数据分级 (及以上)" required>
        <a-select v-model:value="policyForm.securityGrade" style="width: 100%">
          <a-select-option value="L1">对外公开 (L1) 及以上</a-select-option>
          <a-select-option value="L2">对内公开 (L2) 及以上</a-select-option>
          <a-select-option value="L3">机密数据 (L3) 及以上 (推荐)</a-select-option>
          <a-select-option value="L4">绝密数据 (L4) 及以上</a-select-option>
        </a-select>
        <div class="text-xs text-gray-400 mt-1">
          当数据分类定级达到所选级别且无独立脱敏规则时，自动按托底策略进行脱敏
        </div>
      </a-form-item>

      <a-form-item label="默认托底脱敏算法" required>
        <a-radio-group v-model:value="policyForm.algorithmType" class="default-algorithm-radios">
          <a-radio value="MASK_FIXED_STAR">
            <span class="font-medium">返回 * 遮盖的值 (定长 ***)</span>
            <span class="text-xs text-gray-500 block ml-6">将敏感字段统一替换为固定长度的 *** 掩码字符 (推荐)</span>
          </a-radio>
          <a-radio value="MD5" class="mt-3">
            <span class="font-medium">返回 MD5 哈希值</span>
            <span class="text-xs text-gray-500 block ml-6">通过标准 MD5 计算不可逆哈希摘要</span>
          </a-radio>
          <a-radio value="NULL_VALUE" class="mt-3">
            <span class="font-medium">返回空值 (NULL)</span>
            <span class="text-xs text-gray-500 block ml-6">将敏感字段直接清空置为 NULL</span>
          </a-radio>
          <a-radio value="NO_MASK" class="mt-3">
            <span class="font-medium">不脱敏 (返回明文)</span>
            <span class="text-xs text-gray-500 block ml-6">仅记录审计日志，不改变返回字段内容</span>
          </a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item label="策略说明备注">
        <a-textarea
          v-model:value="policyForm.description"
          placeholder="例如：系统全局默认敏感数据托底遮盖策略"
          :rows="2"
          :maxlength="200"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import { customInstance } from '@/api/mutator';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

const saving = ref(false);

const policyForm = reactive({
  securityGrade: 'L3',
  algorithmType: 'MASK_FIXED_STAR',
  description: '默认托底敏感数据保护策略：未单独配置脱敏规则的机密及以上数据自动采用定长掩码***脱敏',
});

const loadPolicy = async () => {
  try {
    const res: any = await customInstance({
      url: '/api/v1/masking-rules/default-policy',
      method: 'GET',
    });
    if (res?.data) {
      policyForm.securityGrade = res.data.securityGrade || 'L3';
      policyForm.algorithmType = res.data.algorithmType || 'MASK_FIXED_STAR';
      policyForm.description = res.data.description || '';
    }
  } catch (err: any) {
    console.error('获取默认脱敏策略失败', err);
  }
};

watch(
  () => props.visible,
  val => {
    if (val) {
      loadPolicy();
    }
  }
);

const handleClose = () => {
  emit('update:visible', false);
};

const handleSave = async () => {
  saving.value = true;
  try {
    await customInstance({
      url: '/api/v1/masking-rules/default-policy',
      method: 'PUT',
      data: policyForm,
    });
    message.success('默认脱敏策略已保存并全局生效');
    emit('update:visible', false);
  } catch (err: any) {
    // handled by mutator
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped lang="less">
.default-algorithm-radios {
  display: flex;
  flex-direction: column;
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}
</style>
