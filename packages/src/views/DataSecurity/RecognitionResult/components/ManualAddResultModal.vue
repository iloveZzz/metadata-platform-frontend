<template>
  <a-modal
    v-model:open="visible"
    title="手动添加识别结果"
    width="920px"
    :confirm-loading="submitting"
    destroy-on-close
    ok-text="上传"
    @ok="handleSubmit"
  >
    <div class="manual-add-container">
      <!-- 1. 添加策略 -->
      <a-card title="添加策略" size="small" class="section-card">
        <a-form layout="vertical">
          <a-form-item label="去重策略" required>
            <a-radio-group v-model:value="dedupStrategy">
              <a-radio value="OVERWRITE_ALL">
                覆盖已有识别结果
                <span class="sub-text">(当新增字段与线上一致时，使用本次打标并标记为手动指定)</span>
              </a-radio>
              <a-radio value="OVERWRITE_UNLOCKED">
                仅覆盖已有自动识别结果
                <span class="sub-text">(当新增字段与线上一致且未锁定时，使用本次打标并标记为手动指定)</span>
              </a-radio>
              <a-radio value="RETAIN_EXISTING">
                保留已有识别结果不更新
                <span class="sub-text">(当新增字段与线上一致时，保留线上已有打标)</span>
              </a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </a-card>

      <!-- 2. 已添加记录管理 -->
      <a-card title="已添加记录" size="small" class="section-card">
        <template #extra>
          <a-space>
            <a-button type="primary" size="small" @click="openAddTableDialog">
              <template #icon><PlusOutlined /></template>
              按表添加
            </a-button>
            <a-button size="small" :disabled="!selectedRowKeys.length" @click="batchChangeCategory">
              批量修改分类
            </a-button>
            <a-button size="small" :disabled="!selectedRowKeys.length" @click="batchChangeMasking(true)">
              批量生效
            </a-button>
            <a-button size="small" danger :disabled="!selectedRowKeys.length" @click="batchDeleteRecords">
              批量删除
            </a-button>
          </a-space>
        </template>

        <a-table
          :data-source="recordList"
          :pagination="false"
          size="small"
          row-key="key"
          :row-selection="{ selectedRowKeys, onChange: (keys: any) => (selectedRowKeys = keys) }"
          :scroll="{ y: 280 }"
        >
          <a-table-column key="tableName" title="数据表" data-index="tableName" width="180">
            <template #default="{ record }">
              <span class="font-medium">{{ record.tableName }}</span>
            </template>
          </a-table-column>
          <a-table-column key="fieldName" title="表字段" data-index="fieldName" width="140">
            <template #default="{ record }">
              <span>{{ record.fieldName }}</span>
            </template>
          </a-table-column>
          <a-table-column key="categoryId" title="数据分类" width="200">
            <template #default="{ record }">
              <a-select
                v-model:value="record.categoryId"
                size="small"
                style="width: 100%"
                placeholder="请选择分类"
                @change="(val: any) => onCategoryChange(record, val)"
              >
                <a-select-option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                  {{ cat.categoryName }}
                </a-select-option>
              </a-select>
            </template>
          </a-table-column>
          <a-table-column key="securityGradeName" title="数据分级" width="90" align="center">
            <template #default="{ record }">
              <a-tag color="blue">{{ record.securityGradeName || 'L1' }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column key="maskingStatus" title="脱敏生效状态" width="110" align="center">
            <template #default="{ record }">
              <a-switch
                :checked="record.maskingStatus === 'ENABLED'"
                size="small"
                @change="(checked: any) => (record.maskingStatus = checked ? 'ENABLED' : 'DISABLED')"
              />
            </template>
          </a-table-column>
          <a-table-column key="action" title="操作" width="140" align="center">
            <template #default="{ record, index }">
              <a-button type="link" size="small" @click="appendFieldForTable(record.tableName)">
                继续配置字段
              </a-button>
              <a-button type="link" danger size="small" @click="recordList.splice(index, 1)"> 删除 </a-button>
            </template>
          </a-table-column>
        </a-table>
      </a-card>
    </div>

    <!-- 按表添加辅助子弹窗 -->
    <a-modal v-model:open="tableDialogVisible" title="按表添加" width="560px" @ok="handleConfirmAddTables">
      <a-form layout="vertical" class="pt-2">
        <a-form-item label="选择数据表 (最多200张)" required>
          <a-select
            v-model:value="dialogSelectedTables"
            mode="multiple"
            placeholder="请选择需要打标的数据表"
            show-search
            style="width: 100%"
          >
            <a-select-option value="fct_pay_order_di">fct_pay_order_di (支付订单表)</a-select-option>
            <a-select-option value="ods_hzct_user_info">ods_hzct_user_info (用户中心信息表)</a-select-option>
            <a-select-option value="dim_customer_account">dim_customer_account (客户账户维度表)</a-select-option>
            <a-select-option value="fct_trade_settlement_di">fct_trade_settlement_di (财务结算明细)</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="配置统一分类">
          <div class="flex items-center gap-4">
            <a-switch v-model:checked="enableUnifiedCategory" />
            <a-select
              v-if="enableUnifiedCategory"
              v-model:value="unifiedCategoryId"
              placeholder="请选择统一数据分类"
              style="width: 260px"
            >
              <a-select-option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">
                {{ cat.categoryName }}
              </a-select-option>
            </a-select>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { manualAddRecognitionResults } from '@/api/recognition-result';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const submitting = ref(false);
const dedupStrategy = ref('OVERWRITE_ALL');
const selectedRowKeys = ref<string[]>([]);

const categoryOptions = [
  { id: 1006, categoryName: '订单信息 (/交易信息/)', grade: 'L2' },
  { id: 1001, categoryName: '-测试 (/个人信息/个人基本信息/)', grade: 'L3' },
  { id: 1007, categoryName: '姓名 (/公交集团/)', grade: 'L3' },
  { id: 1011, categoryName: '居民身份证(中国大陆)', grade: 'L4' },
  { id: 1012, categoryName: '移动电话', grade: 'L3' },
  { id: 1014, categoryName: '银行卡号', grade: 'L3' },
];

interface ManualItem {
  key: string;
  tableName: string;
  fieldName: string;
  categoryId: number;
  securityGradeName: string;
  maskingStatus: string;
}

const recordList = ref<ManualItem[]>([
  {
    key: '1',
    tableName: 'fct_pay_order_di',
    fieldName: 'pay_order_no',
    categoryId: 1006,
    securityGradeName: 'L2',
    maskingStatus: 'ENABLED',
  },
  {
    key: '2',
    tableName: 'ods_hzct_user_info',
    fieldName: 'phone_num',
    categoryId: 1012,
    securityGradeName: 'L3',
    maskingStatus: 'ENABLED',
  },
]);

// 按表添加子弹窗状态
const tableDialogVisible = ref(false);
const dialogSelectedTables = ref<string[]>([]);
const enableUnifiedCategory = ref(false);
const unifiedCategoryId = ref<number | undefined>(1006);

const open = () => {
  visible.value = true;
};

const openAddTableDialog = () => {
  dialogSelectedTables.value = [];
  enableUnifiedCategory.value = false;
  tableDialogVisible.value = true;
};

const TABLE_SAMPLE_FIELDS: Record<string, string[]> = {
  fct_pay_order_di: ['pay_order_no', 'buyer_id', 'pay_amount', 'bank_card_no', 'pay_time'],
  ods_hzct_user_info: ['user_id', 'phone_num', 'id_card_no', 'real_name', 'email_address'],
  dim_customer_account: ['account_no', 'customer_name', 'mobile_phone', 'cert_no', 'open_branch'],
  fct_trade_settlement_di: ['settle_id', 'merchant_id', 'settle_amount', 'bank_account', 'settle_date'],
};

const handleConfirmAddTables = () => {
  if (!dialogSelectedTables.value.length) {
    message.warning('请选择数据表');
    return;
  }

  const catId = enableUnifiedCategory.value && unifiedCategoryId.value ? unifiedCategoryId.value : 1006;
  const grade = categoryOptions.find(c => c.id === catId)?.grade || 'L2';

  let addedCount = 0;
  for (const tableName of dialogSelectedTables.value) {
    const fields = TABLE_SAMPLE_FIELDS[tableName] || ['user_id', 'phone_num', 'amount'];
    for (const fieldName of fields) {
      recordList.value.push({
        key: `${tableName}_${fieldName}_${Date.now()}_${Math.random()}`,
        tableName,
        fieldName,
        categoryId: catId,
        securityGradeName: grade,
        maskingStatus: 'ENABLED',
      });
      addedCount++;
    }
  }

  tableDialogVisible.value = false;
  message.success(`已添加 ${dialogSelectedTables.value.length} 张表共 ${addedCount} 个字段的打标配置`);
};

const appendFieldForTable = (tableName: string) => {
  recordList.value.push({
    key: `${tableName}_field_${Date.now()}`,
    tableName,
    fieldName: 'new_field',
    categoryId: 1006,
    securityGradeName: 'L2',
    maskingStatus: 'ENABLED',
  });
};

const onCategoryChange = (record: ManualItem, catId: number) => {
  const matched = categoryOptions.find(c => c.id === catId);
  if (matched) {
    record.securityGradeName = matched.grade;
  }
};

const batchChangeCategory = () => {
  const cat = categoryOptions[0];
  for (const key of selectedRowKeys.value) {
    const item = recordList.value.find(r => r.key === key);
    if (item && cat) {
      item.categoryId = cat.id;
      item.securityGradeName = cat.grade;
    }
  }
  message.success('已批量更新分类');
};

const batchChangeMasking = (enabled: boolean) => {
  for (const key of selectedRowKeys.value) {
    const item = recordList.value.find(r => r.key === key);
    if (item) {
      item.maskingStatus = enabled ? 'ENABLED' : 'DISABLED';
    }
  }
  message.success('已批量更新生效状态');
};

const batchDeleteRecords = () => {
  recordList.value = recordList.value.filter(r => !selectedRowKeys.value.includes(r.key));
  selectedRowKeys.value = [];
  message.success('已批量删除');
};

const handleSubmit = async () => {
  if (!recordList.value.length) {
    message.warning('请先添加至少一条字段识别记录');
    return;
  }

  submitting.value = true;
  try {
    await manualAddRecognitionResults({
      dedupStrategy: dedupStrategy.value,
      records: recordList.value.map(r => ({
        tableName: r.tableName,
        fieldName: r.fieldName,
        categoryId: r.categoryId,
        maskingStatus: r.maskingStatus,
      })),
    });
    message.success('手动添加识别结果成功');
    visible.value = false;
    emit('success');
  } catch (e: any) {
    message.error(e?.message || '添加失败');
  } finally {
    submitting.value = false;
  }
};

defineExpose({
  open,
});
</script>

<style lang="less" scoped>
.manual-add-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card {
  border-radius: 4px;
}

.sub-text {
  font-size: 12px;
  color: #8c8c8c;
  margin-left: 4px;
}
</style>
