<template>
  <div class="static-guide-card">
    <div class="guide-header" @click="collapsed = !collapsed">
      <div class="guide-title">
        <RocketOutlined style="margin-right: 8px; color: var(--ant-primary-color, #1677ff)" />
        <span class="title-text">静态脱敏操作指引</span>
        <span class="guide-subtitle"
          >支持在代码任务中引用脱敏算法函数脱敏字段，将脱敏后的数据写入开发环境或生产环境的目标表</span
        >
      </div>
      <div class="guide-toggle">
        <span class="toggle-text">{{ collapsed ? '展开指引' : '收起指引' }}</span>
        <UpOutlined v-if="!collapsed" />
        <DownOutlined v-else />
      </div>
    </div>

    <div v-show="!collapsed" class="guide-body">
      <a-row :gutter="16">
        <!-- 步骤一：安装算法包 -->
        <a-col :span="6">
          <div class="step-card step-1" @click="emit('configure-package')">
            <div class="step-badge">步骤一</div>
            <div class="step-content">
              <div class="step-title-row">
                <span class="step-icon-wrap icon-blue">
                  <AppstoreAddOutlined />
                </span>
                <span class="step-name">安装算法包</span>
              </div>
              <p class="step-desc">在资产安全模块，为需使用脱敏算法的项目安装算法包，统一配置安全策略与引擎函数。</p>
              <div class="step-action">
                <a class="action-link">配置项目算法包 &gt;</a>
              </div>
            </div>
          </div>
        </a-col>

        <!-- 步骤二：查看脱敏算法说明 -->
        <a-col :span="6">
          <div class="step-card step-2" @click="emit('view-algorithms')">
            <div class="step-badge">步骤二</div>
            <div class="step-content">
              <div class="step-title-row">
                <span class="step-icon-wrap icon-purple">
                  <BookOutlined />
                </span>
                <span class="step-name">查看脱敏算法说明</span>
              </div>
              <p class="step-desc">了解哈希脱敏、遮盖掩码、保留格式加密等各类算法函数的调用签名与引擎支持规范。</p>
              <div class="step-action">
                <a class="action-link">查看函数目录 &gt;</a>
              </div>
            </div>
          </div>
        </a-col>

        <!-- 步骤三：测试脱敏算法 -->
        <a-col :span="6">
          <div class="step-card step-3" @click="emit('test-algorithm')">
            <div class="step-badge">步骤三</div>
            <div class="step-content">
              <div class="step-title-row">
                <span class="step-icon-wrap icon-orange">
                  <ExperimentOutlined />
                </span>
                <span class="step-name">测试脱敏算法</span>
              </div>
              <p class="step-desc">在将算法引入计算任务前，输入真实样例数据进行在线测试，实时验证脱敏效果。</p>
              <div class="step-action">
                <a class="action-link">测试安全算法 &gt;</a>
              </div>
            </div>
          </div>
        </a-col>

        <!-- 步骤四：计算任务应用脱敏 -->
        <a-col :span="6">
          <div class="step-card step-4" @click="emit('view-sql')">
            <div class="step-badge">步骤四</div>
            <div class="step-content">
              <div class="step-title-row">
                <span class="step-icon-wrap icon-green">
                  <CodeOutlined />
                </span>
                <span class="step-name">计算任务应用脱敏</span>
              </div>
              <p class="step-desc">在离线/实时 SQL 计算任务中引用脱敏函数，将脱敏后数据安全写入目标表。</p>
              <div class="step-action">
                <a class="action-link">查看任务 SQL 示例 &gt;</a>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  RocketOutlined,
  UpOutlined,
  DownOutlined,
  AppstoreAddOutlined,
  BookOutlined,
  ExperimentOutlined,
  CodeOutlined,
} from '@ant-design/icons-vue';

const collapsed = ref(false);

const emit = defineEmits<{
  (e: 'configure-package'): void;
  (e: 'view-algorithms'): void;
  (e: 'test-algorithm'): void;
  (e: 'view-sql'): void;
}>();
</script>

<style scoped lang="less">
.static-guide-card {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;

  .guide-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;

    .guide-title {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;

      .title-text {
        font-size: 14px;
        font-weight: 600;
        color: #1f2329;
      }

      .guide-subtitle {
        font-size: 12px;
        color: #8c8c8c;
      }
    }

    .guide-toggle {
      color: #8c8c8c;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;

      &:hover {
        color: var(--ant-primary-color, #1677ff);
      }
    }
  }

  .guide-body {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;

    .step-card {
      position: relative;
      background: #fafbfc;
      border: 1px solid #eef0f3;
      border-radius: 6px;
      padding: 12px 14px;
      height: 100%;
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;

      &:hover {
        background: #ffffff;
        border-color: var(--ant-primary-color, #1677ff);
        box-shadow: 0 4px 12px var(--ant-primary-1, rgba(22, 119, 255, 0.08));
        transform: translateY(-2px);
      }

      .step-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 11px;
        font-weight: 600;
        color: #8c8c8c;
        background: #f0f2f5;
        padding: 1px 6px;
        border-radius: 4px;
      }

      .step-title-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;

        .step-icon-wrap {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          margin-right: 8px;

          &.icon-blue {
            background: var(--ant-primary-1, #e6f4ff);
            color: var(--ant-primary-color, #1677ff);
          }
          &.icon-purple {
            background: var(--ant-purple-1, #f9f0ff);
            color: var(--ant-purple-color, #722ed1);
          }
          &.icon-orange {
            background: var(--ant-warning-1, #fff7e6);
            color: var(--ant-warning-color, #fa8c16);
          }
          &.icon-green {
            background: var(--ant-success-1, #f6ffed);
            color: var(--ant-success-color, #52c41a);
          }
        }

        .step-name {
          font-size: 13px;
          font-weight: 600;
          color: #262626;
        }
      }

      .step-desc {
        font-size: 12px;
        color: #595959;
        line-height: 1.5;
        margin-bottom: 8px;
        flex: 1;
      }

      .step-action {
        .action-link {
          font-size: 12px;
          font-weight: 500;
          color: var(--ant-primary-color, #1677ff);
          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }
}
</style>
