<template>
  <div class="masking-intro-card">
    <div class="intro-header" @click="collapsed = !collapsed">
      <div class="intro-title">
        <span class="title-text">规则介绍</span>
      </div>
      <div class="intro-toggle">
        <UpOutlined v-if="!collapsed" />
        <DownOutlined v-else />
      </div>
    </div>

    <div v-show="!collapsed" class="intro-body">
      <a-row :gutter="16">
        <!-- 1. 动态脱敏规则 -->
        <a-col :span="12">
          <div class="intro-item">
            <div class="item-icon-title">
              <span class="icon-wrapper dynamic-icon">
                <NodeIndexOutlined />
              </span>
              <span class="item-title">动态脱敏规则</span>
            </div>
            <div class="item-desc">对满足条件的数据对象进行数据变形或加密实现敏感隐私数据的可靠保护</div>
          </div>
        </a-col>

        <!-- 2. 静态脱敏 -->
        <a-col :span="12">
          <div class="intro-item">
            <div class="item-icon-title">
              <span class="icon-wrapper static-icon">
                <TableOutlined />
              </span>
              <span class="item-title">静态脱敏</span>
            </div>
            <div class="item-desc">对计算源相关的表通过选择字段引用脱敏算法选择部分或全部字段输出，生成目标表</div>
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UpOutlined, DownOutlined, NodeIndexOutlined, TableOutlined } from '@ant-design/icons-vue';

const collapsed = ref(false);
</script>

<style scoped lang="less">
.masking-intro-card {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
  transition: all 0.3s ease;

  .intro-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;

    .intro-title {
      display: flex;
      align-items: center;
      .title-text {
        font-size: 14px;
        font-weight: 600;
        color: #1f2329;
      }
    }

    .intro-toggle {
      color: #8c8c8c;
      font-size: 12px;
      &:hover {
        color: var(--ant-primary-color, #1677ff);
      }
    }
  }

  .intro-body {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;

    .intro-item {
      padding: 8px 12px;
      background: #fafbfc;
      border-radius: 4px;
      border: 1px solid #f0f2f5;
      height: 100%;

      .item-icon-title {
        display: flex;
        align-items: center;
        margin-bottom: 6px;

        .icon-wrapper {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
          font-size: 14px;

          &.dynamic-icon {
            background: var(--ant-primary-1, #e6f4ff);
            color: var(--ant-primary-color, #1677ff);
          }
          &.static-icon {
            background: var(--ant-purple-1, #f9f0ff);
            color: var(--ant-purple-color, #722ed1);
          }
        }

        .item-title {
          font-weight: 600;
          font-size: 13px;
          color: #262626;
        }
      }

      .item-desc {
        font-size: 12px;
        color: #595959;
        line-height: 1.5;
      }
    }
  }
}
</style>
