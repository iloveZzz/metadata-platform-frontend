<template>
  <a-modal
    v-model:open="visible"
    :title="isBatch ? '批量编辑识别结果' : '编辑识别结果'"
    :confirm-loading="submitting"
    width="520px"
    @ok="handleSubmit"
  >
    <a-form layout="vertical" class="pt-2">
      <!-- 识别方式单选 -->
      <a-form-item label="打标生效方式" required>
        <a-radio-group v-model:value="form.recognitionMethod">
          <a-radio value="MANUAL">手动指定</a-radio>
          <a-radio value="AUTO">自动识别/继承</a-radio>
        </a-radio-group>
        <div class="form-tip">
          {{
            form.recognitionMethod === 'MANUAL'
              ? '选择手动指定后将锁定当前选择的数据分类，不受后续自动识别覆盖。'
              : '选择自动识别/继承后，将删除手动指定结果并切换为匹配度最高的自动识别或血缘继承打标。'
          }}
        </div>
      </a-form-item>

      <!-- 数据分类选择 -->
      <a-form-item v-if="form.recognitionMethod === 'MANUAL'" label="指定数据分类" required>
        <a-select
          v-model:value="form.categoryId"
          placeholder="请选择目标数据分类"
          show-search
          option-filter-prop="children"
        >
          <a-select-option v-for="cat in categoryList" :key="cat.id" :value="cat.id">
            {{ cat.categoryName }} ({{ cat.securityGradeName || 'L1' }})
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 同步修改脱敏生效状态 -->
      <a-form-item>
        <a-checkbox v-model:checked="form.syncMaskingStatus">
          同步修改为脱敏生效（指定后立即进入动态脱敏覆盖）
        </a-checkbox>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { editRecognitionResult } from '@/api/recognition-result';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const submitting = ref(false);
const isBatch = ref(false);
const targetIds = ref<number[]>([]);

// 模拟分类候选列表
const categoryList = ref([
  { id: 1006, categoryName: '订单信息 (/交易信息/)', securityGradeName: 'L2' },
  { id: 1001, categoryName: '-测试 (/个人信息/个人基本信息/)', securityGradeName: 'L3' },
  { id: 1007, categoryName: '姓名 (/公交集团/)', securityGradeName: 'L3' },
  { id: 1011, categoryName: '居民身份证(中国大陆)', securityGradeName: 'L4' },
  { id: 1012, categoryName: '移动电话', securityGradeName: 'L3' },
  { id: 1014, categoryName: '银行卡号', securityGradeName: 'L3' },
]);

const form = reactive({
  recognitionMethod: 'MANUAL',
  categoryId: undefined as number | undefined,
  syncMaskingStatus: true,
});

const open = (ids: number[], currentMethod = 'MANUAL', currentCategoryId?: number) => {
  targetIds.value = ids;
  isBatch.value = ids.length > 1;
  form.recognitionMethod = currentMethod;
  form.categoryId = currentCategoryId || (categoryList.value[0]?.id as number);
  form.syncMaskingStatus = true;
  visible.value = true;
};

const handleSubmit = async () => {
  if (form.recognitionMethod === 'MANUAL' && !form.categoryId) {
    message.warning('请选择目标数据分类');
    return;
  }

  submitting.value = true;
  try {
    await editRecognitionResult({
      ids: targetIds.value,
      categoryId: form.recognitionMethod === 'MANUAL' ? form.categoryId : undefined,
      recognitionMethod: form.recognitionMethod,
      syncMaskingStatus: form.syncMaskingStatus,
    });
    message.success(isBatch.value ? '批量修改识别结果成功' : '修改识别结果成功');
    visible.value = false;
    emit('success');
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

defineExpose({
  open,
});
</script>

<style lang="less" scoped>
.form-tip {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
