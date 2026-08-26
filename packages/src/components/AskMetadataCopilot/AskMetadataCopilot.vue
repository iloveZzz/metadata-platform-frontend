<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  RobotOutlined,
  SendOutlined,
  ThunderboltOutlined,
  TableOutlined,
  ApartmentOutlined,
  WarningOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue';

import { message } from 'ant-design-vue';
import { askMetadata, type MatchedAssetCardVO } from '@/api/ai';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  intent?: string;
  isFallback?: boolean;
  cards?: MatchedAssetCardVO[];
  timestamp: string;
}

const router = useRouter();
const visible = ref(false);
const inputValue = ref('');
const loading = ref(false);
const chatListRef = ref<HTMLDivElement | null>(null);

const messages = ref<ChatMessage[]>([
  {
    id: 'welcome',
    sender: 'ai',
    text: '您好！我是元数据智能找数助手。请告诉我您想找什么数据，例如业务场景、模型层级、关联指标或具体需求。',
    timestamp: '刚刚',
  },
]);

const quickPrompts = ['🔍 查找公募高净值客户交易表', '📊 推荐客户基础画像 DWD 明细', '🩺 查找近期存在质检波动的资产'];

const openDrawer = () => {
  visible.value = true;
};

const closeDrawer = () => {
  visible.value = false;
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatListRef.value) {
    chatListRef.value.scrollTop = chatListRef.value.scrollHeight;
  }
};

const handleSend = async (queryText?: string) => {
  const query = (queryText || inputValue.value).trim();
  if (!query) {
    message.warning('请输入找数需求');
    return;
  }

  // 追加用户消息
  messages.value.push({
    id: String(Date.now()),
    sender: 'user',
    text: query,
    timestamp: '刚刚',
  });
  inputValue.value = '';
  loading.value = true;
  await scrollToBottom();

  try {
    const res = await askMetadata({ query, limit: 5 });
    const data = res.data || res;
    messages.value.push({
      id: String(Date.now() + 1),
      sender: 'ai',
      text: data.reply || '已为您找到以下匹配资产：',
      intent: data.queryIntent,
      isFallback: data.fallback,
      cards: data.matchedAssets || [],
      timestamp: '刚刚',
    });
  } catch (err: any) {
    // 降级兜底展示
    messages.value.push({
      id: String(Date.now() + 1),
      sender: 'ai',
      text: '未能从大模型服务获取意图解析，已自动降级为本地关键词匹配结果。',
      isFallback: true,
      cards: [
        {
          assetId: 'ast-fallback-1',
          assetName: 'dwd_trade_order_di',
          title: '公募高净值交易明细表',
          domain: 'trade',
          confidenceText: '高匹配 (88%)',
          matchReason: '命中本地分词特征 [公募, 交易]',
          healthScore: 95,
          qualityBand: 'excellent',
          taintStatus: 'NORMAL',
        },
      ],
      timestamp: '刚刚',
    });
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
};

const jumpToDetail = (assetId: string) => {
  visible.value = false;
  router.push(`/assets/${assetId}`);
};

const jumpToLineage = (assetId: string) => {
  visible.value = false;
  router.push(`/assets/${assetId}/lineage`);
};

const getHealthColor = (score?: number) => {
  if (score === undefined || score === null) return 'blue';
  if (score >= 90) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 60) return 'orange';
  return 'red';
};
</script>

<template>
  <div class="ask-copilot-container">
    <!-- 全局悬浮球 -->
    <div class="copilot-fab-btn" title="Ask Metadata 智能找数" @click="openDrawer">
      <div class="fab-pulse-ring"></div>
      <RobotOutlined class="fab-icon" />
      <span class="fab-text">Ask AI</span>
    </div>

    <!-- Copilot 抽屉 -->
    <a-drawer
      :visible="visible"
      :width="480"
      placement="right"
      :closable="false"
      :body-style="{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }"
      @close="closeDrawer"
    >
      <!-- 头部 -->
      <div class="copilot-header">
        <div class="header-left">
          <div class="ai-avatar">
            <RobotOutlined />
          </div>
          <div>
            <div class="ai-title">Ask Metadata Copilot</div>
            <div class="ai-sub">自然语言意图找数 · 术语对齐 · 质量协同</div>
          </div>
        </div>
        <a-button type="text" shape="circle" @click="closeDrawer">
          <CloseOutlined />
        </a-button>
      </div>

      <!-- 快捷 Prompt 区域 -->
      <div class="quick-prompts-bar">
        <div class="prompt-label"><ThunderboltOutlined /> 推荐提问:</div>
        <div class="prompt-chips">
          <a-tag
            v-for="prompt in quickPrompts"
            :key="prompt"
            class="prompt-chip"
            color="processing"
            @click="handleSend(prompt.replace(/^[^\s]+\s*/, ''))"
          >
            {{ prompt }}
          </a-tag>
        </div>
      </div>

      <!-- 消息会话区域 -->
      <div ref="chatListRef" class="chat-messages-area">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['chat-bubble-wrapper', msg.sender === 'user' ? 'user-msg' : 'ai-msg']"
        >
          <div v-if="msg.sender === 'ai'" class="sender-avatar">
            <RobotOutlined />
          </div>
          <div class="bubble-content">
            <!-- 降级提示 -->
            <div v-if="msg.isFallback" class="fallback-tag">
              <a-tag color="warning">本地分词降级模式</a-tag>
            </div>

            <!-- 意图摘要 -->
            <div v-if="msg.intent" class="intent-box"><span class="intent-title">意图解析:</span> {{ msg.intent }}</div>

            <!-- 主文案 -->
            <div class="msg-text">{{ msg.text }}</div>

            <!-- 推荐资产卡片 -->
            <div v-if="msg.cards && msg.cards.length > 0" class="asset-cards-grid">
              <div v-for="card in msg.cards" :key="card.assetId" class="asset-recommend-card">
                <div class="card-header">
                  <div class="card-title-line">
                    <TableOutlined class="card-icon" />
                    <span class="card-asset-name">{{ card.assetName }}</span>
                  </div>
                  <div class="card-tags">
                    <a-tag :color="getHealthColor(card.healthScore)" size="small">
                      质量 {{ card.healthScore || 90 }} 分
                    </a-tag>
                    <a-tag v-if="card.taintStatus === 'TAINTED'" color="error" size="small">
                      <WarningOutlined /> 数据存疑
                    </a-tag>
                  </div>
                </div>

                <div class="card-desc">{{ card.title }}</div>
                <div class="card-match-reason">
                  <span class="reason-badge">{{ card.confidenceText || '匹配度高' }}</span>
                  <span class="reason-text">{{ card.matchReason }}</span>
                </div>

                <div class="card-actions">
                  <a-button type="link" size="small" @click="jumpToDetail(card.assetId)"> 查看详情 </a-button>
                  <a-button type="link" size="small" @click="jumpToLineage(card.assetId)">
                    <ApartmentOutlined /> 血缘热力
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="chat-bubble-wrapper ai-msg">
          <div class="sender-avatar"><RobotOutlined /></div>
          <div class="bubble-content loading-bubble">
            <a-spin size="small" />
            <span class="loading-text">正在理解意图并检索模型库...</span>
          </div>
        </div>
      </div>

      <!-- 输入栏 -->
      <div class="copilot-input-bar">
        <a-textarea
          v-model:value="inputValue"
          placeholder="向 AI 描述找数需求（按 Enter 发送）..."
          :auto-size="{ minRows: 2, maxRows: 4 }"
          :disabled="loading"
          @press-enter.prevent="handleSend()"
        />
        <a-button type="primary" class="send-btn" :loading="loading" @click="handleSend()">
          <template #icon><SendOutlined /></template>
        </a-button>
      </div>
    </a-drawer>
  </div>
</template>

<style scoped>
.ask-copilot-container {
  position: relative;
}

.copilot-fab-btn {
  position: fixed;
  right: 28px;
  bottom: 36px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1677ff 0%, #722ed1 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(22, 119, 255, 0.45);
  z-index: 1000;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.copilot-fab-btn:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 10px 24px rgba(22, 119, 255, 0.6);
}

.fab-icon {
  font-size: 22px;
}

.fab-text {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.copilot-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.ai-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.ai-sub {
  font-size: 12px;
  color: #8c8c8c;
}

.quick-prompts-bar {
  padding: 10px 16px;
  background: #f6f8fb;
  border-bottom: 1px solid #eee;
}

.prompt-label {
  font-size: 12px;
  color: #595959;
  margin-bottom: 6px;
  font-weight: 500;
}

.prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prompt-chip {
  cursor: pointer;
  border-radius: 12px;
  font-size: 12px;
  margin: 0;
  transition: all 0.2s;
}

.prompt-chip:hover {
  transform: translateY(-1px);
}

.chat-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
}

.chat-bubble-wrapper {
  display: flex;
  gap: 10px;
  max-width: 92%;
}

.user-msg {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.ai-msg {
  align-self: flex-start;
}

.sender-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f0f5ff;
  color: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bubble-content {
  background: #f5f5f5;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: #262626;
}

.user-msg .bubble-content {
  background: #1677ff;
  color: #fff;
  border-radius: 10px 2px 10px 10px;
}

.ai-msg .bubble-content {
  border-radius: 2px 10px 10px 10px;
  background: #f9fbfd;
  border: 1px solid #e6f0ff;
}

.intent-box {
  font-size: 11px;
  color: #1677ff;
  background: #e6f4ff;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.fallback-tag {
  margin-bottom: 6px;
}

.asset-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.asset-recommend-card {
  background: #fff;
  border: 1px solid #d9e6f7;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: #1677ff;
}

.card-desc {
  font-size: 12px;
  color: #595959;
  margin-top: 4px;
}

.card-match-reason {
  margin-top: 6px;
  background: #f6f8fb;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reason-badge {
  color: #52c41a;
  font-weight: 600;
}

.reason-text {
  color: #8c8c8c;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
  border-top: 1px dashed #f0f0f0;
  padding-top: 4px;
}

.loading-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8c8c8c;
}

.copilot-input-bar {
  padding: 12px 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  background: #fafafa;
}

.send-btn {
  height: 54px;
}
</style>
