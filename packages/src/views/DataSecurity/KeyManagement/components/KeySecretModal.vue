<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑密钥' : '注册密钥'"
    :confirm-loading="submitting"
    :width="640"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="key-modal-form-wrapper">
      <a-alert
        v-if="isEdit && currentItem?.referencedRulesCount && currentItem.referencedRulesCount > 0"
        type="warning"
        show-icon
        message="风险提示"
        description="当前密钥已被脱敏规则或数据任务引用，修改密钥算法或密钥值可能导致现有任务运行出错，请评估后再决定是否修改。"
        style="margin-bottom: 16px"
      />

      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <!-- 密钥名称 -->
        <a-form-item label="密钥名称" name="keyName" required>
          <a-input
            v-model:value="form.keyName"
            :disabled="isEdit"
            placeholder="支持输入中文、英文、数字或下划线(_)，10个字符以内"
            :maxlength="10"
            show-count
          />
        </a-form-item>

        <!-- 密钥类型 -->
        <a-form-item label="密钥类型" name="keyType" required>
          <a-radio-group v-model:value="form.keyType" @change="handleKeyTypeChange">
            <a-radio value="HASH">哈希脱敏密钥</a-radio>
            <a-radio value="ENCRYPTION">加解密密钥</a-radio>
          </a-radio-group>
          <div class="form-item-help-tip">
            <span v-if="form.keyType === 'HASH'">
              用于加盐哈希脱敏算法（例如加盐MD5），没有严格的格式要求，一般多种加盐哈希脱敏算法可以使用同一个密钥。
            </span>
            <span v-else> 用于加解密算法（例如AES、DES等），有严格的格式要求。一般情况下，不同的算法不可以混用。 </span>
          </div>
        </a-form-item>

        <!-- 加解密算法与密钥长度 (仅加解密密钥显示) -->
        <div v-if="form.keyType === 'ENCRYPTION'" class="algorithm-config-row">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="加解密算法" name="algorithm" required>
                <a-select v-model:value="form.algorithm" placeholder="请选择算法" @change="handleAlgorithmChange">
                  <a-select-option value="AES">AES</a-select-option>
                  <a-select-option value="DES">DES</a-select-option>
                  <a-select-option value="3DES">3DES</a-select-option>
                  <a-select-option value="SM4">SM4 (国密)</a-select-option>
                  <a-select-option value="SM2">SM2 (国密)</a-select-option>
                  <a-select-option value="RSA">RSA / PSA</a-select-option>
                  <a-select-option value="FF1">FPE (FF1)</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>

            <a-col v-if="form.algorithm !== 'SM2'" :span="12">
              <a-form-item label="密钥长度" name="keyLength" required>
                <a-select v-model:value="form.keyLength" :disabled="isKeyLengthFixed" placeholder="请选择位数">
                  <a-select-option v-for="opt in lengthOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </a-select-option>
                </a-select>
                <div v-if="isKeyLengthFixed" class="text-xs text-gray-400 mt-1">
                  {{ form.algorithm === 'DES' ? 'DES 仅支持64位，不支持修改' : 'SM4 仅支持128位，不支持修改' }}
                </div>
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <!-- 生成方式 -->
        <a-form-item label="生成方式" name="genType" required>
          <a-radio-group v-model:value="form.genType">
            <a-radio value="SYSTEM">系统生成</a-radio>
            <a-radio value="CUSTOM">自定义</a-radio>
          </a-radio-group>
          <div class="form-item-help-tip">
            <span v-if="form.genType === 'SYSTEM'">密钥值由系统自动生成，无需手动设置。</span>
            <span v-else>需要手动设置密钥值等参数。</span>
          </div>
        </a-form-item>

        <!-- 自定义密钥输入区 -->
        <div v-if="form.genType === 'CUSTOM'" class="custom-key-section">
          <!-- 非对称密钥 (SM2 / RSA) 公钥 + 私钥 -->
          <template v-if="form.keyType === 'ENCRYPTION' && (form.algorithm === 'SM2' || form.algorithm === 'RSA')">
            <a-form-item label="公钥 (Public Key)" name="publicKey" required>
              <a-textarea v-model:value="form.publicKey" placeholder="请输入公开的密钥 (PEM/HEX/Base64)" :rows="2" />
            </a-form-item>
            <a-form-item label="私钥 (Private Key)" name="privateKey" required>
              <a-textarea v-model:value="form.privateKey" placeholder="请输入私有的密钥 (PEM/HEX/Base64)" :rows="2" />
              <div class="form-item-help-tip">
                在密钥对场景下，使用公钥加密，需使用私钥解密；使用私钥加密，需使用公钥解密。
              </div>
            </a-form-item>
          </template>

          <!-- 对称密钥或哈希脱敏密钥 (AES, DES, 3DES, SM4, FF1, HASH) -->
          <template v-else>
            <a-form-item label="密钥值" name="customKeyValue" required>
              <a-textarea v-model:value="form.customKeyValue" :placeholder="customKeyPlaceholder" :rows="2" />
              <div class="form-item-help-tip">
                自定义密钥值填写长度需和所选密钥长度一致（例如128位密钥需要16个字符字节）。如原系统密钥长度不符，请手动补齐至目标长度。
              </div>
            </a-form-item>
          </template>
        </div>

        <!-- 仅负责人管理 -->
        <a-form-item label="仅负责人管理">
          <div class="flex items-center gap-3">
            <a-switch v-model:checked="form.ownerOnly" />
            <span class="text-xs text-gray-500">
              {{
                form.ownerOnly
                  ? '已开启：仅超级管理员和密钥负责人支持执行编辑、授权、转交、删除操作'
                  : '默认关闭：超级管理员、安全管理员和密钥负责人均支持执行管理操作'
              }}
            </span>
          </div>
        </a-form-item>

        <!-- 密钥描述 -->
        <a-form-item label="密钥描述" name="description">
          <a-textarea
            v-model:value="form.description"
            placeholder="输入密钥的简单描述，不超过128字符"
            :rows="2"
            :maxlength="128"
            show-count
          />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance, Rule } from 'ant-design-vue/es/form';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { KeyManagementItem } from '../hooks/useKeyManagement';

const emit = defineEmits(['success']);
const api = getDataSecurityCenterAPIAPIApi();

const visible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const currentItem = ref<KeyManagementItem | null>(null);
const formRef = ref<FormInstance>();

const form = reactive({
  id: undefined as number | undefined,
  keyName: '',
  keyType: 'HASH',
  algorithm: 'AES',
  keyLength: 256 as number | undefined,
  genType: 'SYSTEM',
  customKeyValue: '',
  publicKey: '',
  privateKey: '',
  ownerOnly: false,
  description: '',
});

const lengthOptions = computed(() => {
  const algo = form.algorithm;
  if (algo === 'AES' || algo === 'FF1') {
    return [
      { label: '128位 (16字节)', value: 128 },
      { label: '192位 (24字节)', value: 192 },
      { label: '256位 (32字节)', value: 256 },
    ];
  }
  if (algo === 'DES') {
    return [{ label: '64位 (8字节)', value: 64 }];
  }
  if (algo === '3DES') {
    return [
      { label: '112位 (14字节)', value: 112 },
      { label: '168位 (24字节)', value: 168 },
    ];
  }
  if (algo === 'SM4') {
    return [{ label: '128位 (16字节)', value: 128 }];
  }
  if (algo === 'RSA') {
    return [
      { label: '1024位', value: 1024 },
      { label: '2048位 (推荐)', value: 2048 },
      { label: '4096位', value: 4096 },
    ];
  }
  return [{ label: '128位', value: 128 }];
});

const isKeyLengthFixed = computed(() => {
  return form.algorithm === 'DES' || form.algorithm === 'SM4';
});

const customKeyPlaceholder = computed(() => {
  if (form.keyType === 'HASH') {
    return '请输入加盐哈希脱敏密钥值 (如任意加盐字符串)...';
  }
  const bytes = form.keyLength ? form.keyLength / 8 : 16;
  return `请输入自定义密钥值 (需精确满足 ${form.keyLength || 128} 位 / ${bytes} 字节字符)...`;
});

const handleKeyTypeChange = () => {
  if (form.keyType === 'ENCRYPTION') {
    form.algorithm = 'AES';
    form.keyLength = 256;
  } else {
    form.algorithm = '-';
    form.keyLength = undefined;
  }
};

const handleAlgorithmChange = () => {
  const algo = form.algorithm;
  if (algo === 'DES') {
    form.keyLength = 64;
  } else if (algo === 'SM4') {
    form.keyLength = 128;
  } else if (algo === '3DES') {
    form.keyLength = 112;
  } else if (algo === 'RSA') {
    form.keyLength = 2048;
  } else if (algo === 'SM2') {
    form.keyLength = undefined;
  } else {
    form.keyLength = 256;
  }
};

const validateKeyName = async (_rule: any, value: string) => {
  if (!value || !value.trim()) {
    return Promise.reject('请输入密钥名称');
  }
  if (value.length > 10) {
    return Promise.reject('密钥名称不能超过10个字符');
  }
  const pattern = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
  if (!pattern.test(value)) {
    return Promise.reject('支持输入中文、英文、数字或下划线(_)');
  }
  return Promise.resolve();
};

const validateCustomKey = async (_rule: any, value: string) => {
  if (form.genType !== 'CUSTOM') return Promise.resolve();
  if (form.keyType === 'ENCRYPTION' && (form.algorithm === 'SM2' || form.algorithm === 'RSA')) {
    return Promise.resolve();
  }
  if (!value || !value.trim()) {
    return Promise.reject('请输入自定义密钥值');
  }
  if (form.keyType === 'ENCRYPTION' && form.keyLength) {
    const requiredBytes = form.keyLength / 8;
    if (value.trim().length !== requiredBytes) {
      return Promise.reject(`自定义密钥长度必须为 ${requiredBytes} 个字符字节 (对应 ${form.keyLength} 位)`);
    }
  }
  return Promise.resolve();
};

const rules: Record<string, Rule[]> = {
  keyName: [{ validator: validateKeyName, trigger: 'blur' }],
  keyType: [{ required: true, message: '请选择密钥类型', trigger: 'change' }],
  algorithm: [{ required: true, message: '请选择加解密算法', trigger: 'change' }],
  genType: [{ required: true, message: '请选择生成方式', trigger: 'change' }],
  customKeyValue: [{ validator: validateCustomKey, trigger: 'blur' }],
  publicKey: [{ required: true, message: '请输入公钥', trigger: 'blur' }],
  privateKey: [{ required: true, message: '请输入私钥', trigger: 'blur' }],
};

const open = (row?: KeyManagementItem) => {
  isEdit.value = !!row;
  currentItem.value = row || null;
  if (row) {
    form.id = row.id;
    form.keyName = row.keyName;
    form.keyType = row.keyType || 'HASH';
    form.algorithm = row.algorithm || 'AES';
    form.keyLength = row.keyLength || (form.algorithm === 'SM4' ? 128 : 256);
    form.genType = row.genType || 'SYSTEM';
    form.ownerOnly = !!row.ownerOnly;
    form.description = row.description || '';
    form.customKeyValue = '';
    form.publicKey = row.publicKeyValue || '';
    form.privateKey = '';
  } else {
    form.id = undefined;
    form.keyName = '';
    form.keyType = 'HASH';
    form.algorithm = '-';
    form.keyLength = undefined;
    form.genType = 'SYSTEM';
    form.ownerOnly = false;
    form.description = '';
    form.customKeyValue = '';
    form.publicKey = '';
    form.privateKey = '';
  }
  visible.value = true;
};

const handleCancel = () => {
  visible.value = false;
  formRef.value?.resetFields();
};

const handleOk = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (isEdit.value && form.id) {
      await (api as any).updateKey(form.id, {
        keyType: form.keyType,
        algorithm: form.algorithm,
        keyLength: form.keyLength,
        genType: form.genType,
        customKeyValue: form.customKeyValue || undefined,
        publicKey: form.publicKey || undefined,
        privateKey: form.privateKey || undefined,
        ownerOnly: form.ownerOnly,
        description: form.description,
      });
      message.success(`密钥 [${form.keyName}] 更新成功`);
    } else {
      await (api as any).createKey({
        keyName: form.keyName,
        keyType: form.keyType,
        algorithm: form.algorithm,
        keyLength: form.keyLength,
        genType: form.genType,
        customKeyValue: form.customKeyValue || undefined,
        publicKey: form.publicKey || undefined,
        privateKey: form.privateKey || undefined,
        ownerOnly: form.ownerOnly,
        description: form.description,
      });
      message.success(`密钥 [${form.keyName}] 注册成功`);
    }
    visible.value = false;
    emit('success');
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

defineExpose({ open });
</script>

<style scoped lang="less">
.key-modal-form-wrapper {
  padding-top: 8px;

  .form-item-help-tip {
    font-size: 12px;
    color: #8c8c8c;
    margin-top: 4px;
    line-height: 1.5;
  }

  .algorithm-config-row {
    background: #fafafa;
    border-radius: 4px;
    padding: 12px 12px 0 12px;
    margin-bottom: 16px;
    border: 1px solid #f0f0f0;
  }

  .custom-key-section {
    background: #f6ffed;
    border: 1px dashed #b7eb8f;
    border-radius: 4px;
    padding: 12px 12px 0 12px;
    margin-bottom: 16px;
  }
}
</style>
