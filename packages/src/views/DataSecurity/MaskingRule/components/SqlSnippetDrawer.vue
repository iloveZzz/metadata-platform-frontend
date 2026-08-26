<template>
  <a-drawer v-model:open="visible" title="计算任务中引用脱敏函数 - SQL 代码示例" width="680px" destroy-on-close>
    <div class="sql-drawer-container">
      <!-- 定位提示 -->
      <div v-if="targetFunction" class="target-func-alert">
        <AimOutlined style="color: var(--ant-primary-color, #1677ff); margin-right: 6px" />
        <span
          >已定位脱敏函数: <code class="target-func-code">{{ targetFunction }}</code></span
        >
      </div>

      <div class="tip-bar">
        <CodeOutlined style="color: var(--ant-primary-color, #1677ff); margin-right: 6px" />
        <span>在已安装脱敏算法包的项目计算任务中，可直接在 SQL 的 SELECT 语句中调用安全函数进行字段级数据脱敏。</span>
      </div>

      <!-- 引擎选择 Tabs -->
      <a-tabs v-model:active-key="activeEngine">
        <a-tab-pane key="spark" tab="Spark SQL (离线/批处理)" />
        <a-tab-pane key="maxcompute" tab="MaxCompute (ODPS)" />
        <a-tab-pane key="hive" tab="Hive SQL" />
        <a-tab-pane key="flink" tab="Flink SQL (实时流计算)" />
      </a-tabs>

      <!-- 场景 1: 写开发表常用脱敏作业 -->
      <div class="scenario-section">
        <div class="scenario-title-row">
          <span class="scenario-title">场景一：从生产环境抽取敏感数据并脱敏写入开发测试表</span>
          <a-button type="primary" ghost size="small" @click="copyCode(currentSnippet.scene1)">
            <template #icon><CopyOutlined /></template>
            复制代码
          </a-button>
        </div>
        <pre class="code-box">{{ currentSnippet.scene1 }}</pre>
      </div>

      <!-- 场景 2: 保持格式加密与哈希关联主键 -->
      <div class="scenario-section">
        <div class="scenario-title-row">
          <span class="scenario-title">场景二：多字段组合脱敏与可关联加密/哈希计算</span>
          <a-button type="primary" ghost size="small" @click="copyCode(currentSnippet.scene2)">
            <template #icon><CopyOutlined /></template>
            复制代码
          </a-button>
        </div>
        <pre class="code-box">{{ currentSnippet.scene2 }}</pre>
      </div>

      <!-- 注意事项与最佳实践 -->
      <div class="notes-card">
        <div class="notes-title">💡 研发注意事项与合规要求:</div>
        <ul class="notes-list">
          <li><strong>项目前置依赖</strong>：请确保目标计算项目已在【项目算法包管理】中成功安装脱敏算法包。</li>
          <li>
            <strong>字段类型兼容</strong>：掩码函数（如手机号、身份证、姓名）输入与输出类型均为
            <code>STRING</code>，请注意目标表字段定义。
          </li>
          <li>
            <strong>保留格式加密 (FPE)</strong>：密文与明文字符集和长度完全一致，适用于作为主外键参与多表
            <code>JOIN</code> 关联计算。
          </li>
          <li>
            <strong>加盐哈希防彩虹表</strong>：调用 <code>sec_hash_sha256</code> 时建议指定团队动态
            Salt，增强数据防撞库安全性。
          </li>
        </ul>
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { message } from 'ant-design-vue';
import { CodeOutlined, CopyOutlined, AimOutlined } from '@ant-design/icons-vue';

const props = defineProps<{
  open: boolean;
  targetFunction?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const visible = ref(props.open);
watch(
  () => props.open,
  val => {
    visible.value = val;
  }
);
watch(
  () => visible.value,
  val => {
    emit('update:open', val);
  }
);

const activeEngine = ref('spark');

const snippets = {
  spark: {
    scene1: `-- Spark SQL: 将生产用户核心表脱敏写入开发环境表
INSERT OVERWRITE TABLE dev_dw.t_user_info_masked
PARTITION (ds = '\${bizdate}')
SELECT
    user_id,
    sec_mask_name(cust_name)                AS cust_name,    -- 姓名脱敏: 张*封
    sec_mask_phone(mobile)                  AS mobile,       -- 手机号脱敏: 138****5678
    sec_mask_idcard(id_card)                AS id_card,      -- 身份证掩码: 110101********2345
    sec_mask_email(email)                   AS email,        -- 邮箱掩码: z***@yss.com.cn
    sec_mask_bankcard(card_no)              AS card_no,      -- 银行卡掩码: 622202*********4455
    sec_mask_null(credit_score)             AS credit_score, -- 绝密字段置空
    register_time,
    current_timestamp()                     AS etl_time
FROM prod_dw.t_user_info_source
WHERE ds = '\${bizdate}';`,
    scene2: `-- Spark SQL: FPE保留格式加密与哈希主键关联作业
INSERT OVERWRITE TABLE dev_dw.t_trade_order_masked
SELECT
    order_no,
    sec_crypto_fpe(account_no, 'key_fpe_prod') AS account_no, -- 保持原长加密，支持后续JOIN
    sec_hash_sha256(cust_token, 'sec_salt_yss') AS cust_hash, -- 加盐哈希
    order_amount,
    trade_status
FROM prod_dw.t_trade_order_source;`,
  },
  maxcompute: {
    scene1: `-- MaxCompute (ODPS SQL): 敏感用户数据静态脱敏入库
INSERT OVERWRITE TABLE dev_project.dim_user_masked PARTITION (dt='\${bdp.system.bizdate}')
SELECT
    user_id,
    sec_mask_name(cust_name)      AS cust_name,
    sec_mask_phone(mobile)        AS mobile,
    sec_mask_idcard(id_card)      AS id_card,
    sec_mask_email(email)         AS email,
    sec_mask_bankcard(card_no)    AS card_no,
    gmt_create
FROM prod_project.dim_user_source
WHERE dt = '\${bdp.system.bizdate}';`,
    scene2: `-- MaxCompute: 敏感字段自定义掩码与不可逆加盐哈希
SELECT
    cust_id,
    sec_mask_custom(address, 3, 10, '*')        AS masked_addr,
    sec_hash_sha256(password_hash, 'salt_2026') AS safe_token
FROM prod_project.ods_cust_private_detail;`,
  },
  hive: {
    scene1: `-- Hive SQL: 离线数仓 ODS 层到 DWD 层静态脱敏写入
INSERT OVERWRITE TABLE dwd_sec.dwd_cust_info_d
PARTITION (dt = '\${hiveconf:STAT_DATE}')
SELECT
    id,
    sec_mask_name(real_name)     AS real_name,
    sec_mask_phone(phone_number) AS phone_number,
    sec_mask_idcard(id_number)   AS id_number,
    sec_mask_bankcard(bank_card) AS bank_card,
    update_time
FROM ods_raw.ods_cust_info_full
WHERE dt = '\${hiveconf:STAT_DATE}';`,
    scene2: `-- Hive SQL: 加密与哈希计算
SELECT
    trade_id,
    sec_crypto_fpe(card_num, 'key_fpe_01') AS card_num,
    sec_hash_md5(device_fingerprint)        AS device_hash
FROM ods_raw.ods_trade_log;`,
  },
  flink: {
    scene1: `-- Flink SQL 实时流计算: 实时消费 Kafka 敏感数据脱敏下沉到开发 MySQL
INSERT INTO dev_mysql_sink
SELECT
    user_id,
    sec_mask_name(username)    AS username,
    sec_mask_phone(phone)      AS phone,
    sec_mask_idcard(id_card)   AS id_card,
    PROCTIME()                 AS proc_time
FROM kafka_prod_user_source;`,
    scene2: `-- Flink 实时流多路分流与加盐脱敏
INSERT INTO kafka_dev_sink
SELECT
    event_id,
    sec_hash_sha256(token, 'sec_salt_yss') AS token_hash,
    sec_mask_phone(mobile)                 AS mobile
FROM kafka_order_stream;`,
  },
};

const currentSnippet = computed(() => {
  return snippets[activeEngine.value as keyof typeof snippets] || snippets.spark;
});

const copyCode = (code: string) => {
  navigator.clipboard.writeText(code);
  message.success('SQL 代码示例已复制到剪贴板');
};
</script>

<style scoped lang="less">
.sql-drawer-container {
  padding-top: 4px;

  .target-func-alert {
    display: flex;
    align-items: center;
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    color: #262626;
    margin-bottom: 10px;

    .target-func-code {
      font-family: 'Fira Code', 'Consolas', monospace;
      font-weight: 600;
      color: var(--ant-primary-color, #1677ff);
      background: #ffffff;
      padding: 1px 6px;
      border-radius: 3px;
      border: 1px solid #d9d9d9;
    }
  }

  .tip-bar {
    display: flex;
    align-items: center;
    background: var(--ant-primary-1, #e6f4ff);
    border: 1px solid var(--ant-primary-3, #91caff);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    color: #1f2329;
    margin-bottom: 12px;
  }

  .scenario-section {
    margin-bottom: 16px;

    .scenario-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;

      .scenario-title {
        font-size: 13px;
        font-weight: 600;
        color: #262626;
      }
    }

    .code-box {
      margin: 0;
      background: #1e1e1e;
      color: #9cdcfe;
      border-radius: 6px;
      padding: 12px 14px;
      font-size: 12px;
      line-height: 1.6;
      font-family: 'Fira Code', 'Consolas', monospace;
      overflow-x: auto;
      border: 1px solid #333333;
    }
  }

  .notes-card {
    background: #fafbfc;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    padding: 12px 16px;

    .notes-title {
      font-size: 13px;
      font-weight: 600;
      color: #1f2329;
      margin-bottom: 6px;
    }

    .notes-list {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: #595959;
      line-height: 1.6;

      li {
        margin-bottom: 4px;
      }

      code {
        background: #f0f0f0;
        padding: 1px 4px;
        border-radius: 3px;
        color: #d4380d;
        font-size: 11px;
      }
    }
  }
}
</style>
