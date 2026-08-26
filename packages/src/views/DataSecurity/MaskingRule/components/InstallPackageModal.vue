<template>
  <a-modal
    v-model:open="visible"
    title="为项目安装/配置脱敏算法包"
    width="620px"
    :confirm-loading="submitting"
    destroy-on-close
    @ok="handleSubmit"
  >
    <div class="install-modal-container">
      <div class="tip-bar">
        <AppstoreAddOutlined style="color: var(--ant-primary-color, #1677ff); margin-right: 6px" />
        <span
          >为指定数据项目安装脱敏算法函数包，该项目下的 Spark / Hive / MaxCompute 等计算任务即可直接调用脱敏 UDF。</span
        >
      </div>

      <a-form layout="vertical" class="install-form">
        <a-form-item label="目标计算项目" required>
          <a-select
            v-model:value="form.projectId"
            placeholder="请选择需要安装算法包的项目"
            @change="handleProjectChange"
          >
            <a-select-option value="prj_default">默认数据开发项目 (PRJ_DEFAULT)</a-select-option>
            <a-select-option value="prj_investment">投研数据分析项目 (PRJ_INVESTMENT)</a-select-option>
            <a-select-option value="prj_risk">风控集市计算项目 (PRJ_RISK)</a-select-option>
            <a-select-option value="prj_regulatory">监管报送数据项目 (PRJ_REGULATORY)</a-select-option>
            <a-select-option value="prj_marketing">智能营销应用项目 (PRJ_MARKETING)</a-select-option>
          </a-select>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="计算引擎" required>
              <a-select v-model:value="form.engineType">
                <a-select-option value="Spark SQL / Hive">Spark SQL / Hive</a-select-option>
                <a-select-option value="MaxCompute">MaxCompute (ODPS)</a-select-option>
                <a-select-option value="MySQL / Flink">MySQL / Flink</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="算法包版本" required>
              <a-select v-model:value="form.packageVersion">
                <a-select-option value="v1.5.0-standard">v1.5.0-standard (最新稳定版 / 推荐)</a-select-option>
                <a-select-option value="v1.4.2-standard">v1.4.2-standard</a-select-option>
                <a-select-option value="v1.3.0-standard">v1.3.0-standard (基础版)</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="授权脱敏函数清单">
          <div class="functions-box">
            <a-checkbox-group v-model:value="form.authorizedFunctions">
              <a-row :gutter="[8, 8]">
                <a-col :span="12">
                  <a-checkbox value="sec_mask_phone">sec_mask_phone (手机号)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_mask_idcard">sec_mask_idcard (身份证)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_mask_name">sec_mask_name (中文姓名)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_mask_bankcard">sec_mask_bankcard (银行卡)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_mask_email">sec_mask_email (邮箱)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_hash_sha256">sec_hash_sha256 (加盐哈希)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_hash_md5">sec_hash_md5 (MD5哈希)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_crypto_fpe">sec_crypto_fpe (保留格式加密)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_mask_custom">sec_mask_custom (自定义掩码)</a-checkbox>
                </a-col>
                <a-col :span="12">
                  <a-checkbox value="sec_mask_null">sec_mask_null (置空)</a-checkbox>
                </a-col>
              </a-row>
            </a-checkbox-group>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import { AppstoreAddOutlined } from '@ant-design/icons-vue';
import { installProjectPackage, type InstallPackageDTO } from '@/api/static-masking';

const props = defineProps<{
  open: boolean;
  initialProject?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'success'): void;
}>();

const visible = ref(props.open);
watch(
  () => props.open,
  val => {
    visible.value = val;
    if (val && props.initialProject) {
      form.projectId = props.initialProject;
    }
  }
);
watch(
  () => visible.value,
  val => {
    emit('update:open', val);
  }
);

const submitting = ref(false);

const form = reactive<InstallPackageDTO>({
  projectId: props.initialProject || 'prj_marketing',
  projectName: '',
  engineType: 'Spark SQL / Hive',
  packageVersion: 'v1.5.0-standard',
  authorizedFunctions: [
    'sec_mask_phone',
    'sec_mask_idcard',
    'sec_mask_name',
    'sec_mask_bankcard',
    'sec_mask_email',
    'sec_hash_sha256',
    'sec_hash_md5',
    'sec_crypto_fpe',
    'sec_mask_custom',
    'sec_mask_null',
  ],
});

const handleProjectChange = (val: any) => {
  if (val === 'prj_default') {
    form.projectName = '默认数据开发项目';
    form.engineType = 'Spark SQL / Hive';
  } else if (val === 'prj_investment') {
    form.projectName = '投研数据分析项目';
    form.engineType = 'Spark SQL';
  } else if (val === 'prj_risk') {
    form.projectName = '风控集市计算项目';
    form.engineType = 'MaxCompute';
  } else if (val === 'prj_regulatory') {
    form.projectName = '监管报送数据项目';
    form.engineType = 'Hive / Spark SQL';
  } else if (val === 'prj_marketing') {
    form.projectName = '智能营销应用项目';
    form.engineType = 'MySQL / Flink';
  }
};

const handleSubmit = async () => {
  if (!form.projectId) {
    message.warning('请选择目标计算项目');
    return;
  }
  submitting.value = true;
  try {
    await installProjectPackage({
      projectId: form.projectId,
      projectName: form.projectName,
      engineType: form.engineType,
      packageVersion: form.packageVersion,
      authorizedFunctions: form.authorizedFunctions,
    });
    message.success('脱敏算法包安装/升级成功！');
    visible.value = false;
    emit('success');
  } catch {
    // 错误已由 mutator 全局处理
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped lang="less">
.install-modal-container {
  padding-top: 6px;

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

  .functions-box {
    background: #fafbfc;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    padding: 12px;
  }
}
</style>
