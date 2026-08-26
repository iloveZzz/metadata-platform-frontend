<template>
  <a-modal v-model:open="visible" title="查看密钥明文值 (高危操作)" :footer="null" :width="560">
    <div class="reveal-modal-content">
      <a-alert
        type="error"
        show-icon
        message="高危安全操作警告"
        description="查看密钥属于高度敏感行为，本次操作已生成安全审计日志（记录操作人、时间、来源IP及目标密钥）。请妥善保管明文信息，禁止未经许可外传。"
        style="margin-bottom: 16px"
      />

      <div class="key-info-header">
        <div class="info-item">
          <span class="label">密钥名称：</span>
          <span class="value font-bold text-blue-600">{{ currentKey?.keyName }}</span>
        </div>
        <div class="info-item">
          <span class="label">密钥类型 / 算法：</span>
          <span class="value"
            >{{ currentKey?.keyType === 'HASH' ? '哈希脱敏密钥' : '加解密密钥' }} ({{
              currentKey?.algorithm || '-'
            }})</span
          >
        </div>
        <div class="info-item">
          <span class="label">负责人：</span>
          <span class="value">{{ currentKey?.owner }}</span>
        </div>
      </div>

      <div class="plaintext-result-box">
        <div class="result-header">
          <span class="text-xs text-gray-500 font-semibold">解密明文 (Plaintext Key Value)</span>
          <a-button type="link" size="small" :disabled="!plaintext || loading" @click="handleCopy">
            <template #icon><CopyOutlined /></template>
            复制明文
          </a-button>
        </div>

        <div v-if="loading" class="loading-wrap">
          <a-spin tip="正在受控解密中并留存审计日志..." />
        </div>
        <div v-else class="plaintext-body">
          <pre class="plaintext-code">{{ plaintext || '暂无明文数据' }}</pre>
        </div>
      </div>

      <div class="modal-footer-btn">
        <a-button type="primary" @click="visible = false">关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { CopyOutlined } from '@ant-design/icons-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { KeyManagementItem } from '../hooks/useKeyManagement';

const api = getDataSecurityCenterAPIAPIApi();

const visible = ref(false);
const loading = ref(false);
const currentKey = ref<KeyManagementItem | null>(null);
const plaintext = ref('');

const open = async (row: KeyManagementItem) => {
  currentKey.value = row;
  plaintext.value = '';
  visible.value = true;
  loading.value = true;

  try {
    const res = await api.revealKeyPlaintext(row.id);
    plaintext.value = (res as any)?.data || (res as any)?.value || String(res);
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '查看明文失败');
  } finally {
    loading.value = false;
  }
};

const handleCopy = () => {
  if (!plaintext.value) return;
  navigator.clipboard
    .writeText(plaintext.value)
    .then(() => {
      message.success('密钥明文已复制到剪贴板');
    })
    .catch(() => {
      message.warning('复制失败，请手动选中文本复制');
    });
};

defineExpose({ open });
</script>

<style scoped lang="less">
.reveal-modal-content {
  padding-top: 8px;

  .key-info-header {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 13px;

    .info-item {
      margin-bottom: 4px;
      &:last-child {
        margin-bottom: 0;
      }
      .label {
        color: #8c8c8c;
        width: 120px;
        display: inline-block;
      }
      .value {
        color: #262626;
      }
    }
  }

  .plaintext-result-box {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #ffffff;
    overflow: hidden;

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      background: #f5f5f5;
      border-bottom: 1px solid #e8e8e8;
    }

    .loading-wrap {
      padding: 30px 0;
      text-align: center;
    }

    .plaintext-body {
      padding: 12px;
      max-height: 200px;
      overflow-y: auto;
      background: #fffbe6;

      .plaintext-code {
        margin: 0;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        font-size: 13px;
        color: #d4380d;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
  }

  .modal-footer-btn {
    margin-top: 20px;
    text-align: right;
  }
}
</style>
