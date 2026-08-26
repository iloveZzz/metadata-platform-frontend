<template>
  <a-drawer v-model:open="visible" title="密钥使用说明" placement="right" :width="520" :footer="null">
    <div class="key-help-content">
      <!-- 概念说明 -->
      <div class="help-section">
        <h4 class="section-title">
          <BookOutlined class="icon-blue" />
          概念说明
        </h4>
        <p class="section-desc">
          密钥是敏感数据保护体系中的核心资产，用于加盐哈希脱敏、对称加解密以及国密/非对称算法的运算支撑。统一由平台进行信封加密（Master
          Key）安全托管，保障明文不落盘、不外泄。
        </p>
      </div>

      <a-divider style="margin: 16px 0" />

      <!-- 密钥类型 - 哈希脱敏密钥 -->
      <div class="help-section">
        <h4 class="section-title">
          <SafetyOutlined class="icon-green" />
          密钥类型：哈希脱敏密钥
        </h4>
        <p class="section-desc">用于加盐哈希脱敏算法（例如加盐MD5、加盐SHA256等）。</p>
        <ul class="help-list">
          <li><strong>格式要求</strong>：没有严格的格式与固定长度要求，通常为任意强度的加盐字符串；</li>
          <li><strong>复用性</strong>：一般情况下，多种加盐哈希脱敏算法可以共用同一个哈希密钥；</li>
          <li><strong>不可逆性</strong>：加盐哈希为单向不可逆计算，无法通过解密还原明文数据。</li>
        </ul>
      </div>

      <a-divider style="margin: 16px 0" />

      <!-- 密钥类型 - 加解密密钥 -->
      <div class="help-section">
        <h4 class="section-title">
          <LockOutlined class="icon-purple" />
          密钥类型：加解密密钥
        </h4>
        <p class="section-desc">用于可逆加解密算法（例如 AES、DES、3DES、SM2、SM4、RSA、FF1 等）。</p>
        <ul class="help-list">
          <li><strong>格式要求</strong>：有严格的密钥位数与字节长度要求（如 128位对应 16 字节字符）；</li>
          <li><strong>算法隔离</strong>：不同算法和不同长度的密钥严禁混用；</li>
          <li><strong>密钥对场景</strong>：SM2 与 RSA 支持公私钥对，公钥用于加密/验签，私钥用于解密/签名。</li>
        </ul>
      </div>

      <a-divider style="margin: 16px 0" />

      <!-- 加解密算法与位数规格参考 -->
      <div class="help-section">
        <h4 class="section-title">
          <AppstoreOutlined class="icon-orange" />
          加解密算法与位数参考
        </h4>
        <a-table :data-source="algorithmSpecs" :columns="specColumns" :pagination="false" size="small" bordered />
      </div>

      <a-divider style="margin: 16px 0" />

      <!-- 使用建议 -->
      <div class="help-section">
        <h4 class="section-title">
          <BulbOutlined class="icon-yellow" />
          使用建议
        </h4>
        <a-alert
          type="info"
          show-icon
          message="最佳实践建议"
          description="1. 生产环境金融合规场景建议优先选用国密 SM4 (128位) 或 SM2 算法；2. 敏感手机号、银行卡如需保留原格式查询建议使用 FF1 保留格式加密；3. 启用【仅负责人管理】可防止非核心成员误改误删。"
        />
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BookOutlined, SafetyOutlined, LockOutlined, AppstoreOutlined, BulbOutlined } from '@ant-design/icons-vue';

const visible = ref(false);

const specColumns = [
  { title: '加解密算法', dataIndex: 'algorithm', key: 'algorithm', width: 120 },
  { title: '支持位数 / 长度', dataIndex: 'keyLength', key: 'keyLength' },
  { title: '说明', dataIndex: 'remark', key: 'remark' },
];

const algorithmSpecs = [
  { key: '1', algorithm: 'AES', keyLength: '128位 / 192位 / 256位', remark: '业界标准高强度对称加密' },
  { key: '2', algorithm: 'DES', keyLength: '仅支持 64位', remark: '传统对称算法，固定 8 字节' },
  { key: '3', algorithm: '3DES', keyLength: '112位 / 168位', remark: '三重数据加密算法' },
  { key: '4', algorithm: 'SM4', keyLength: '仅支持 128位', remark: '国家密码管理局标准商用对称算法' },
  { key: '5', algorithm: 'RSA (PSA)', keyLength: '1024位 / 2048位 / 4096位', remark: '经典非对称公私钥加密体系' },
  { key: '6', algorithm: 'SM2', keyLength: '椭圆曲线 (无需配置位数)', remark: '国家密码管理局标准非对称公私钥' },
  { key: '7', algorithm: 'FPE (FF1)', keyLength: '128位 / 192位 / 256位', remark: '保留数据长度与字符集格式加密' },
];

const open = () => {
  visible.value = true;
};

defineExpose({ open });
</script>

<style scoped lang="less">
.key-help-content {
  font-size: 13px;
  line-height: 1.6;
  color: #333;

  .help-section {
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2329;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-desc {
      color: #646a73;
      margin-bottom: 8px;
    }
    .help-list {
      padding-left: 18px;
      margin: 0;
      color: #555;
      li {
        margin-bottom: 4px;
      }
    }
  }

  .icon-blue {
    color: #1677ff;
  }
  .icon-green {
    color: #52c41a;
  }
  .icon-purple {
    color: #722ed1;
  }
  .icon-orange {
    color: #fa8c16;
  }
  .icon-yellow {
    color: #faad14;
  }
}
</style>
