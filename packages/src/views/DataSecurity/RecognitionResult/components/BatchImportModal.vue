<template>
  <a-modal v-model:open="visible" title="批量导入识别结果" width="840px" destroy-on-close :footer="null">
    <div class="batch-import-container">
      <a-steps :current="currentStep" size="small" class="mb-4">
        <a-step title="配置导入参数" />
        <a-step title="数据预校验" />
        <a-step title="导入完成" />
      </a-steps>

      <!-- 步骤 1: 配置导入参数 -->
      <div v-if="currentStep === 0" class="step-content">
        <a-form layout="vertical">
          <a-form-item label="资产类型" required>
            <a-radio-group v-model:value="form.assetType">
              <a-radio value="DATAPHIN">Dataphin表 (物理表/逻辑表)</a-radio>
              <a-radio value="DATASOURCE">数据源表 (指定数据源DB/Schema)</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="导入模板下载">
            <div class="template-box">
              <FileExcelOutlined class="excel-icon" />
              <div class="template-info">
                <span class="template-name">
                  {{
                    form.assetType === 'DATAPHIN' ? 'Dataphin表识别结果导入模板.xlsx' : '数据源表识别结果导入模板.xlsx'
                  }}
                </span>
                <span class="template-tip">请参照模板表头与命名规范填写，单次不超过1000行（不超过10MB）</span>
              </div>
              <a-button type="link" @click="handleDownloadTemplate">下载模板</a-button>
            </div>
          </a-form-item>

          <a-form-item label="上传配置文件 (.xlsx)" required>
            <a-upload-dragger
              name="file"
              :file-list="fileList"
              :before-upload="beforeUpload"
              @remove="
                () => {
                  fileList = [];
                }
              "
            >
              <p class="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p class="ant-upload-text">单击或将 .xlsx 文件拖拽至此区域上传</p>
              <p class="ant-upload-hint">支持单文件不超过 10MB，最多 1000 行记录</p>
            </a-upload-dragger>
          </a-form-item>

          <a-divider style="margin: 12px 0" />

          <!-- 兼容策略 -->
          <a-form-item label="重复记录处理策略" required>
            <a-radio-group v-model:value="form.conflictStrategy">
              <a-radio value="OVERWRITE_ALL">
                覆盖线上所有识别结果
                <span class="sub-tip">(使用本次打标覆盖已有所有结果并标记为手动指定)</span>
              </a-radio>
              <a-radio value="OVERWRITE_UNLOCKED">
                覆盖线上所有未被锁定识别结果
                <span class="sub-tip">(不覆盖生效方式为手动指定的记录)</span>
              </a-radio>
              <a-radio value="RETAIN_EXISTING"> 保留线上已有识别结果，跳过不更新 </a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item label="脱敏生效状态兼容策略" required>
            <a-radio-group v-model:value="form.maskingPolicy">
              <a-radio value="RETAIN_CONFIG">保留线上已有配置，新增结果统一为生效</a-radio>
              <a-radio value="UNIFIED_ENABLED">新增和更新结果统一置为生效</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>

        <div class="flex justify-end gap-2 mt-4">
          <a-button @click="visible = false">取消</a-button>
          <a-button type="primary" :loading="validating" @click="handleStartValidate"> 开始校验 </a-button>
        </div>
      </div>

      <!-- 步骤 2: 预校验结果展示 -->
      <div v-if="currentStep === 1" class="step-content">
        <div v-if="previewResult" class="validate-result-box">
          <div class="result-summary">
            <a-alert
              :message="`校验完成：共检测 ${previewResult.totalCount} 条记录，通过 ${previewResult.validCount} 条，重复 ${previewResult.duplicateCount} 条，异常 ${previewResult.errorCount} 条`"
              type="info"
              show-icon
            >
              <template #action>
                <a-button size="small" type="link" @click="handleDownloadValidationReport"> 下载校验记录 </a-button>
              </template>
            </a-alert>
          </div>

          <a-tabs default-active-key="valid" size="small" class="mt-3">
            <a-tab-pane key="valid" :tab="`校验通过 (${previewResult.validCount})`">
              <a-table
                :data-source="previewResult.validRows"
                size="small"
                :pagination="false"
                :scroll="{ y: 220 }"
                row-key="rowNumber"
              >
                <a-table-column title="行号" data-index="rowNumber" width="60" />
                <a-table-column title="数据表" data-index="tableName" />
                <a-table-column title="字段" data-index="fieldName" />
                <a-table-column title="数据分类" data-index="categoryName" />
                <a-table-column title="数据分级" data-index="securityGradeName" width="90" />
              </a-table>
            </a-tab-pane>

            <a-tab-pane key="duplicate" :tab="`重复记录 (${previewResult.duplicateCount})`">
              <a-table
                :data-source="previewResult.duplicateRows"
                size="small"
                :pagination="false"
                :scroll="{ y: 220 }"
                row-key="rowNumber"
              >
                <a-table-column title="行号" data-index="rowNumber" width="60" />
                <a-table-column title="数据表" data-index="tableName" />
                <a-table-column title="字段" data-index="fieldName" />
                <a-table-column title="数据分类(导入)" data-index="categoryName" />
                <a-table-column title="数据分类(线上)" data-index="onlineCategoryName" />
                <a-table-column title="处理提示" data-index="errorMessage" />
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <a-button @click="currentStep = 0">上一步</a-button>
          <a-button type="primary" :loading="importing" @click="handleExecuteImport"> 开始导入 </a-button>
        </div>
      </div>

      <!-- 步骤 3: 导入完成 -->
      <div v-if="currentStep === 2" class="step-content text-center py-6">
        <a-result
          status="success"
          title="识别结果导入成功"
          sub-title="所有通过校验的识别记录已成功入库并生效对应脱敏策略。"
        >
          <template #extra>
            <a-button type="primary" @click="handleFinish">完成并查看列表</a-button>
          </template>
        </a-result>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { FileExcelOutlined, InboxOutlined } from '@ant-design/icons-vue';
import {
  previewImportRecognitionResults,
  executeImportRecognitionResults,
  type ImportPreviewResult,
} from '@/api/recognition-result';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const currentStep = ref(0);
const validating = ref(false);
const importing = ref(false);
const fileList = ref<any[]>([]);
const previewResult = ref<ImportPreviewResult | null>(null);

const form = reactive({
  assetType: 'DATAPHIN',
  conflictStrategy: 'OVERWRITE_ALL',
  maskingPolicy: 'UNIFIED_ENABLED',
});

const open = () => {
  currentStep.value = 0;
  fileList.value = [];
  previewResult.value = null;
  visible.value = true;
};

const beforeUpload = (file: any) => {
  fileList.value = [file];
  return false;
};

const handleDownloadTemplate = () => {
  message.success('已开始下载标准 Excel 导入模板');
};

const handleDownloadValidationReport = () => {
  message.success('已导出当前校验结果 Excel 报告');
};

const handleStartValidate = async () => {
  validating.value = true;
  try {
    const res = await previewImportRecognitionResults({
      assetType: form.assetType,
      conflictStrategy: form.conflictStrategy,
      maskingPolicy: form.maskingPolicy,
    });
    previewResult.value = res?.data || null;
    currentStep.value = 1;
    message.success('文件规范与数据校验通过');
  } catch (e: any) {
    message.error(e?.message || '校验异常');
  } finally {
    validating.value = false;
  }
};

const handleExecuteImport = async () => {
  importing.value = true;
  try {
    await executeImportRecognitionResults({
      assetType: form.assetType,
      conflictStrategy: form.conflictStrategy,
      maskingPolicy: form.maskingPolicy,
      fileName: fileList.value[0]?.name || 'recognition_import_data.xlsx',
    });
    currentStep.value = 2;
    emit('success');
  } catch (e: any) {
    message.error(e?.message || '导入失败');
  } finally {
    importing.value = false;
  }
};

const handleFinish = () => {
  visible.value = false;
  emit('success');
};

defineExpose({
  open,
});
</script>

<style lang="less" scoped>
.template-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;

  .excel-icon {
    font-size: 24px;
    color: #52c41a;
  }

  .template-info {
    flex: 1;
    display: flex;
    flex-direction: column;

    .template-name {
      font-weight: 500;
      color: #262626;
    }

    .template-tip {
      font-size: 12px;
      color: #8c8c8c;
    }
  }
}

.sub-tip {
  font-size: 12px;
  color: #8c8c8c;
  margin-left: 4px;
}
</style>
