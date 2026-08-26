<template>
  <a-modal v-model:open="visible" title="安全脱敏算法 - 在线测试工作台" width="680px" :footer="null" destroy-on-close>
    <div class="test-modal-container">
      <div class="tip-bar">
        <ExperimentOutlined style="color: var(--ant-primary-color, #1677ff); margin-right: 6px" />
        <span>选择脱敏算法并输入真实样例值，实时试算脱敏输出效果及生成的 SQL 计算调用片段。</span>
      </div>

      <a-form layout="vertical" class="test-form">
        <!-- 1. 脱敏函数选择 -->
        <a-form-item label="脱敏算法函数" required>
          <a-select v-model:value="form.functionName" style="width: 100%" @change="handleFunctionChange">
            <a-select-option value="sec_mask_phone">sec_mask_phone - 手机号码掩码 (保留前3后4)</a-select-option>
            <a-select-option value="sec_mask_idcard">sec_mask_idcard - 身份证号掩码 (保留前6后4)</a-select-option>
            <a-select-option value="sec_mask_name">sec_mask_name - 中文姓名掩码 (首尾保留)</a-select-option>
            <a-select-option value="sec_mask_bankcard">sec_mask_bankcard - 银行卡号掩码 (保留前6后4)</a-select-option>
            <a-select-option value="sec_mask_email">sec_mask_email - 电子邮箱掩码 (保留首位与域名)</a-select-option>
            <a-select-option value="sec_hash_sha256">sec_hash_sha256 - 加盐SHA256哈希脱敏 (不可逆)</a-select-option>
            <a-select-option value="sec_hash_md5">sec_hash_md5 - 加盐MD5哈希脱敏 (32位特征码)</a-select-option>
            <a-select-option value="sec_crypto_fpe">sec_crypto_fpe - FPE保留格式原生加密 (密文等长)</a-select-option>
            <a-select-option value="sec_mask_custom">sec_mask_custom - 自定义区间掩码 (自定义起止位)</a-select-option>
            <a-select-option value="sec_mask_null">sec_mask_null - 敏感字段置空 (NULL)</a-select-option>
          </a-select>
        </a-form-item>

        <!-- 2. 测试样本值输入与快捷填充 -->
        <a-form-item label="测试原始值 (Sample Input)" required>
          <div class="sample-preset-row">
            <span class="preset-label">快捷填入:</span>
            <a-space size="small" wrap>
              <a-tag class="preset-tag" @click="fillSample('13812345678', 'sec_mask_phone')">手机号</a-tag>
              <a-tag class="preset-tag" @click="fillSample('110101199003072345', 'sec_mask_idcard')">身份证</a-tag>
              <a-tag class="preset-tag" @click="fillSample('诸葛孔明', 'sec_mask_name')">姓名</a-tag>
              <a-tag class="preset-tag" @click="fillSample('6222021001122334455', 'sec_mask_bankcard')">银行卡</a-tag>
              <a-tag class="preset-tag" @click="fillSample('dev_security@yss.com.cn', 'sec_mask_email')">邮箱</a-tag>
              <a-tag class="preset-tag" @click="fillSample('YssSecretPassword#2026', 'sec_hash_sha256')"
                >敏感口令</a-tag
              >
            </a-space>
          </div>
          <a-input v-model:value="form.rawValue" placeholder="请输入待脱敏的测试文本或数值" allow-clear />
        </a-form-item>

        <!-- 3. 动态扩展参数 -->
        <!-- 哈希加盐参数 -->
        <div
          v-if="form.functionName === 'sec_hash_sha256' || form.functionName === 'sec_hash_md5'"
          class="dynamic-params-box"
        >
          <a-form-item label="加盐密钥 (Salt Key)">
            <a-input v-model:value="form.params.salt" placeholder="默认: sec_salt_yss" />
          </a-form-item>
        </div>

        <!-- FPE 保留格式加密参数 -->
        <div v-else-if="form.functionName === 'sec_crypto_fpe'" class="dynamic-params-box">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="密钥标识 (Key Ref)">
                <a-input v-model:value="form.params.keyRef" placeholder="默认: key_fpe_prod" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="字符集模式 (Charset)">
                <a-select v-model:value="form.params.charset" style="width: 100%">
                  <a-select-option value="ALPHANUMERIC">字母数字混排 (Alphanumeric)</a-select-option>
                  <a-select-option value="NUMERIC">仅数字 (Numeric)</a-select-option>
                  <a-select-option value="CHINESE">中文汉字 (Chinese)</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <!-- 自定义掩码参数 -->
        <div v-else-if="form.functionName === 'sec_mask_custom'" class="dynamic-params-box">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="起始下标 (Start Index)">
                <a-input-number v-model:value="form.params.start" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="结束下标 (End Index)">
                <a-input-number v-model:value="form.params.end" :min="0" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="掩码字符 (Mask Char)">
                <a-input v-model:value="form.params.maskChar" :maxlength="1" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <div class="submit-btn-row">
          <a-button type="primary" :loading="testing" @click="runTest">
            <template #icon><ThunderboltOutlined /></template>
            立即执行脱敏试算
          </a-button>
        </div>
      </a-form>

      <!-- 4. 试算结果卡片 -->
      <div v-if="testResult" class="result-card">
        <div class="result-header">
          <span class="result-title">
            <CheckCircleOutlined style="color: var(--ant-success-color, #52c41a); margin-right: 6px" />
            试算执行成功
          </span>
          <a-space size="small">
            <a-tag color="blue">{{ testResult.algorithmType }}</a-tag>
            <span class="cost-tag">耗时: {{ testResult.costMs }} ms</span>
          </a-space>
        </div>

        <div class="result-row">
          <span class="label">脱敏输出值:</span>
          <span class="output-value">{{ testResult.maskedValue }}</span>
        </div>

        <div class="sql-snippet-box">
          <div class="snippet-header">
            <span>SQL 计算任务调用语法:</span>
            <a-button type="link" size="small" @click="copySql(testResult.sqlSnippet)">
              <template #icon><CopyOutlined /></template>
              复制 SQL 片段
            </a-button>
          </div>
          <pre class="snippet-code">{{ testResult.sqlSnippet }}</pre>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import { ExperimentOutlined, ThunderboltOutlined, CheckCircleOutlined, CopyOutlined } from '@ant-design/icons-vue';
import { testStaticAlgorithm, type StaticMaskTestResultVO } from '@/api/static-masking';

const props = defineProps<{
  open: boolean;
  initialFunction?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const visible = ref(props.open);
watch(
  () => props.open,
  val => {
    visible.value = val;
    if (val && props.initialFunction) {
      form.functionName = props.initialFunction;
    }
  }
);
watch(
  () => visible.value,
  val => {
    emit('update:open', val);
  }
);

const form = reactive({
  functionName: props.initialFunction || 'sec_mask_phone',
  rawValue: '13812345678',
  params: {
    salt: 'sec_salt_yss',
    start: 3,
    end: 7,
    maskChar: '*',
    keyRef: 'key_fpe_prod',
    charset: 'ALPHANUMERIC',
  } as Record<string, any>,
});

const testing = ref(false);
const testResult = ref<StaticMaskTestResultVO | null>(null);

const handleFunctionChange = (val: any) => {
  if (val === 'sec_mask_phone') form.rawValue = '13812345678';
  else if (val === 'sec_mask_idcard') form.rawValue = '110101199003072345';
  else if (val === 'sec_mask_name') form.rawValue = '诸葛孔明';
  else if (val === 'sec_mask_bankcard') form.rawValue = '6222021001122334455';
  else if (val === 'sec_mask_email') form.rawValue = 'dev_security@yss.com.cn';
  else if (val === 'sec_hash_sha256' || val === 'sec_hash_md5') form.rawValue = 'YssSecretPassword#2026';
  else if (val === 'sec_crypto_fpe') form.rawValue = '13812345678';
  else if (val === 'sec_mask_custom') form.rawValue = 'ABCDEFGHIJKL';
};

const fillSample = (sample: string, func?: string) => {
  form.rawValue = sample;
  if (func) {
    form.functionName = func;
  }
};

const runTest = async () => {
  if (!form.rawValue && form.functionName !== 'sec_mask_null') {
    message.warning('请输入待测试的原始值');
    return;
  }
  testing.value = true;
  try {
    const res = await testStaticAlgorithm({
      functionName: form.functionName,
      rawValue: form.rawValue,
      params: form.params,
    });
    if (res && res.data) {
      testResult.value = res.data;
      message.success('脱敏试算完成');
    }
  } catch {
    // 错误已由 mutator 全局处理
  } finally {
    testing.value = false;
  }
};

const copySql = (sql: string) => {
  navigator.clipboard.writeText(sql);
  message.success('SQL 代码片段已复制到剪贴板');
};
</script>

<style scoped lang="less">
.test-modal-container {
  padding-top: 8px;

  .tip-bar {
    display: flex;
    align-items: center;
    background: var(--ant-primary-1, #e6f4ff);
    border: 1px solid var(--ant-primary-3, #91caff);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    color: #1f2329;
    margin-bottom: 16px;
  }

  .test-form {
    .sample-preset-row {
      display: flex;
      align-items: center;
      margin-bottom: 6px;

      .preset-label {
        font-size: 12px;
        color: #8c8c8c;
        margin-right: 6px;
      }

      .preset-tag {
        cursor: pointer;
        font-size: 11px;
        &:hover {
          color: var(--ant-primary-color, #1677ff);
          border-color: var(--ant-primary-color, #1677ff);
        }
      }
    }

    .dynamic-params-box {
      background: #fafbfc;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }

    .submit-btn-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
      margin-bottom: 16px;
    }
  }

  .result-card {
    background: var(--ant-success-1, #f6ffed);
    border: 1px solid var(--ant-success-3, #b7eb8f);
    border-radius: 6px;
    padding: 12px 16px;

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .result-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--ant-success-color, #389e0d);
      }

      .cost-tag {
        font-size: 12px;
        color: #8c8c8c;
      }
    }

    .result-row {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      font-size: 13px;

      .label {
        color: #595959;
        margin-right: 8px;
      }

      .output-value {
        font-family: monospace;
        font-weight: 700;
        color: #092b00;
        background: #ffffff;
        padding: 4px 10px;
        border-radius: 4px;
        border: 1px solid #d9d9d9;
      }
    }

    .sql-snippet-box {
      background: #ffffff;
      border: 1px solid var(--ant-success-2, #d9f7be);
      border-radius: 4px;
      padding: 8px 12px;

      .snippet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #595959;
        margin-bottom: 4px;
      }

      .snippet-code {
        margin: 0;
        background: #24292e;
        color: #7ee787;
        padding: 8px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-family: monospace;
        overflow-x: auto;
      }
    }
  }
}
</style>
