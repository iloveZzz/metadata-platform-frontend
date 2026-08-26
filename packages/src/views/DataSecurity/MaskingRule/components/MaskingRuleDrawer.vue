<template>
  <a-drawer
    :open="visible"
    :title="readonly ? '查看动态脱敏规则' : isEdit ? '编辑动态脱敏规则' : '新建动态脱敏规则'"
    :width="720"
    :footer-style="{ textAlign: 'right' }"
    :mask-closable="false"
    @close="handleClose"
  >
    <a-form ref="formRef" layout="vertical" :model="formData" :rules="formRules">
      <!-- 1. 规则名称 -->
      <a-form-item label="规则名称" name="ruleName" required>
        <a-input
          v-model:value="formData.ruleName"
          :disabled="isEdit"
          placeholder="输入动态脱敏规则名称，例如：身份证号脱敏"
          :maxlength="64"
          show-count
        />
        <div v-if="isEdit" class="text-xs text-gray-400 mt-1">注：规则名称创建后不支持修改</div>
      </a-form-item>

      <!-- 2. 规则脱敏说明 -->
      <a-form-item label="规则脱敏说明" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="自定义规则脱敏备注信息，不超过200字符。例如：用于开发环境中读取生产环境数据。"
          :rows="2"
          :maxlength="200"
          show-count
        />
      </a-form-item>

      <!-- 3. 数据分类 -->
      <a-form-item label="数据分类" name="categoryId" required>
        <a-tree-select
          v-model:value="formData.categoryId"
          placeholder="请选择您有管理权限的数据分类，例如：/个人信息/个人基本信息/身份证"
          allow-clear
          tree-default-expand-all
          :tree-data="categoryTreeData"
          :field-names="{ label: 'categoryName', value: 'id', children: 'children' }"
        />
      </a-form-item>

      <!-- 4. 所属板块 & 所属项目 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="所属板块" name="plateScope">
            <a-radio-group v-model:value="formData.plateScopeType" class="mb-2">
              <a-radio value="ALL">全部板块</a-radio>
              <a-radio value="CUSTOM">指定枚举</a-radio>
            </a-radio-group>
            <a-select
              v-if="formData.plateScopeType === 'CUSTOM'"
              v-model:value="formData.selectedPlates"
              mode="tags"
              placeholder="选择或输入板块"
              style="width: 100%"
            >
              <a-select-option value="资管板块">资管板块</a-select-option>
              <a-select-option value="估值板块">估值板块</a-select-option>
              <a-select-option value="交易板块">交易板块</a-select-option>
              <a-select-option value="清算板块">清算板块</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="所属项目" name="projectScope">
            <a-radio-group v-model:value="formData.projectScopeType" class="mb-2">
              <a-radio value="ALL">全部项目</a-radio>
              <a-radio value="CUSTOM">指定枚举</a-radio>
            </a-radio-group>
            <a-select
              v-if="formData.projectScopeType === 'CUSTOM'"
              v-model:value="formData.selectedProjects"
              mode="tags"
              placeholder="选择或输入项目"
              style="width: 100%"
            >
              <a-select-option value="默认项目">默认项目</a-select-option>
              <a-select-option value="投研分析项目">投研分析项目</a-select-option>
              <a-select-option value="风控项目">风控项目</a-select-option>
              <a-select-option value="监管报送项目">监管报送项目</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 5. 应用场景 -->
      <a-form-item label="应用场景" name="applyScenes" required>
        <a-checkbox-group v-model:value="formData.applyScenes">
          <a-checkbox value="WRITE_DEV_TABLE">
            <span class="font-medium">写开发表</span>
            <span class="text-xs text-gray-500 ml-1">（对来源表敏感数据的查询结果脱敏后再写入开发表中）</span>
          </a-checkbox>
          <div class="mt-2">
            <a-checkbox value="DATA_QUERY">
              <span class="font-medium">数据查询</span>
              <span class="text-xs text-gray-500 ml-1"
                >（针对不参与生产调度的即席查询/分析查询select结果脱敏后展示）</span
              >
            </a-checkbox>
          </div>
        </a-checkbox-group>
      </a-form-item>

      <!-- 6. 脱敏方式 -->
      <a-form-item label="脱敏方式" name="maskMethod" required>
        <a-radio-group v-model:value="formData.maskMethod">
          <div class="method-option-card" :class="{ active: formData.maskMethod === 'UNDERLYING' }">
            <a-radio value="UNDERLYING">
              <span class="font-semibold text-gray-800">底层脱敏</span>
              <span class="text-xs text-gray-500 ml-2"
                >在数据被查询出来时即脱敏，SQL处理使用脱敏结果，保护效果更强。</span
              >
            </a-radio>
          </div>
          <div class="method-option-card mt-2" :class="{ active: formData.maskMethod === 'DISPLAY' }">
            <a-radio value="DISPLAY">
              <span class="font-semibold text-gray-800">展示脱敏</span>
              <span class="text-xs text-gray-500 ml-2"
                >在数据最终对外展示时脱敏，SQL处理用原文支持where/join等，对业务更友好。</span
              >
            </a-radio>
          </div>
        </a-radio-group>
      </a-form-item>

      <a-divider style="margin: 16px 0" />

      <!-- 7. 脱敏算法配置 -->
      <div class="algorithm-config-section">
        <div class="section-title">
          <span class="title-bold">脱敏算法与参数</span>
          <span class="text-xs text-gray-400 font-normal ml-2">
            带标记的算法为高级算法，需所在计算引擎安装安全函数支持
          </span>
        </div>

        <a-row :gutter="16" class="mt-3">
          <a-col :span="12">
            <a-form-item label="算法大类" required>
              <a-select v-model:value="formData.algorithmCategory" @change="onAlgorithmCategoryChange">
                <a-select-option value="MASK">遮盖掩码</a-select-option>
                <a-select-option value="HASH">哈希脱敏</a-select-option>
                <a-select-option value="CRYPTO">加密脱敏</a-select-option>
                <a-select-option value="OTHER">其它</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="子脱敏算法" required>
              <a-select v-model:value="formData.subAlgorithm" @change="onSubAlgorithmChange">
                <template v-if="formData.algorithmCategory === 'MASK'">
                  <a-select-option value="MASK_KEYWORD">遮盖掩码-关键字替换</a-select-option>
                  <a-select-option value="MASK_CUSTOM">遮盖掩码-自定义掩码</a-select-option>
                  <a-select-option value="MASK_CUSTOM_VAL">遮盖掩码-自定义掩码（自定义替换值）</a-select-option>
                </template>
                <template v-else-if="formData.algorithmCategory === 'HASH'">
                  <a-select-option value="HASH_SHA256">哈希脱敏-加盐SHA256</a-select-option>
                  <a-select-option value="HASH_SHA384">哈希脱敏-加盐SHA384</a-select-option>
                  <a-select-option value="HASH_MD5">哈希脱敏-加盐MD5</a-select-option>
                  <a-select-option value="HASH_SHA512">哈希脱敏-加盐SHA512</a-select-option>
                </template>
                <template v-else-if="formData.algorithmCategory === 'CRYPTO'">
                  <a-select-option value="CRYPTO_FPE_NATIVE">FPE保留格式原生加密 [MaxCompute]</a-select-option>
                  <a-select-option value="CRYPTO_FPE_RANGE">FPE保留格式加密 [区间配置]</a-select-option>
                </template>
                <template v-else>
                  <a-select-option value="NULL_VALUE">返回空值 (NULL)</a-select-option>
                  <a-select-option value="NO_MASK">不脱敏</a-select-option>
                </template>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 遮盖掩码 - 关键字替换 -->
        <div v-if="formData.subAlgorithm === 'MASK_KEYWORD'" class="algorithm-subcard">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="正则表达式" required>
                <a-input v-model:value="formData.maskKeyword.regexPattern" placeholder="例如：^(\d{6})\d+(\d{4})$" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="替换字符串" required>
                <a-input v-model:value="formData.maskKeyword.replaceString" placeholder="例如：$1********$2" />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <!-- 遮盖掩码 - 自定义掩码参数组 -->
        <div
          v-if="formData.subAlgorithm === 'MASK_CUSTOM' || formData.subAlgorithm === 'MASK_CUSTOM_VAL'"
          class="algorithm-subcard"
        >
          <div class="text-xs font-medium text-gray-700 mb-2 flex justify-between items-center">
            <span>遮盖掩码参数组（成对增减）</span>
            <a-button type="dashed" size="small" @click="addMaskRangeItem">
              <template #icon><PlusOutlined /></template> 添加参数段
            </a-button>
          </div>
          <div v-for="(item, idx) in formData.customMaskRanges" :key="idx" class="range-item-row">
            <a-space size="small" align="center" style="width: 100%">
              <span class="text-xs text-gray-500">段{{ idx + 1 }}: 起始</span>
              <a-input-number v-model:value="item.start" :min="1" :max="100" style="width: 80px" />
              <span class="text-xs text-gray-500">截止</span>
              <a-input-number v-model:value="item.end" :min="1" :max="100" style="width: 80px" />
              <span class="text-xs text-gray-500">替换为</span>
              <a-input v-model:value="item.maskChar" placeholder="*" style="width: 120px" />
              <a-button
                v-if="formData.customMaskRanges.length > 1"
                type="text"
                danger
                size="small"
                @click="removeMaskRangeItem(idx)"
              >
                <DeleteOutlined />
              </a-button>
            </a-space>
          </div>
        </div>

        <!-- 哈希脱敏 - 脱敏密钥 -->
        <div v-if="formData.algorithmCategory === 'HASH'" class="algorithm-subcard">
          <a-form-item label="脱敏密钥 (加盐Salt)" required>
            <a-input-password
              v-model:value="formData.hashSaltKey"
              placeholder="加盐哈希脱敏算法的必填参数，无严格格式要求"
            />
          </a-form-item>
        </div>

        <!-- 加密脱敏 (CRYPTO) -->
        <div v-if="formData.algorithmCategory === 'CRYPTO'" class="algorithm-subcard">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="加密字典" required>
                <a-select v-model:value="formData.cryptoConfig.dictType">
                  <a-select-option value="DIGIT">数字 (0-9)</a-select-option>
                  <a-select-option value="UPPER">大写英文字母 (A-Z)</a-select-option>
                  <a-select-option value="LOWER">小写英文字母 (a-z)</a-select-option>
                  <a-select-option value="DIGIT_UPPER">数字 + 大写英文字母</a-select-option>
                  <a-select-option value="DIGIT_LOWER">数字 + 小写英文字母</a-select-option>
                  <a-select-option value="DIGIT_LETTER">数字 + 英文字母</a-select-option>
                  <a-select-option value="SPECIAL">特殊符号</a-select-option>
                  <a-select-option value="CUSTOM">自定义字符字典</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Tweak (混淆扰动参数)">
                <a-input v-model:value="formData.cryptoConfig.tweak" placeholder="支持任意字符，提高密文唯一性" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item v-if="formData.cryptoConfig.dictType === 'CUSTOM'" label="自定义加密字典字符集">
            <a-input v-model:value="formData.cryptoConfig.customDict" placeholder="例如：0123456789ABCDEF" />
          </a-form-item>

          <!-- FPE 区间加密专属起止位 -->
          <a-row v-if="formData.subAlgorithm === 'CRYPTO_FPE_RANGE'" :gutter="16">
            <a-col :span="12">
              <a-form-item label="加密区间模式">
                <a-radio-group v-model:value="formData.cryptoConfig.rangeMode">
                  <a-radio value="ALL">全部字符加密</a-radio>
                  <a-radio value="PARTIAL">指定起止位</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
            <a-col v-if="formData.cryptoConfig.rangeMode === 'PARTIAL'" :span="12">
              <a-form-item label="起止位置 (从1开始)">
                <a-space>
                  <a-input-number v-model:value="formData.cryptoConfig.rangeStart" :min="1" placeholder="起始" />
                  <span>至</span>
                  <a-input-number v-model:value="formData.cryptoConfig.rangeEnd" :min="1" placeholder="结束" />
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="异常兼容策略" required>
            <a-radio-group v-model:value="formData.cryptoConfig.exceptionStrategy">
              <a-radio value="NULL">返回空值 (NULL)</a-radio>
              <a-radio value="PLAINTEXT">返回明文</a-radio>
              <a-radio value="THROW_ERROR">抛出异常</a-radio>
            </a-radio-group>
            <div class="text-xs text-gray-400 mt-1">
              当出现明文不符合算法格式、密钥不匹配或编码不一致时，按所选策略安全处理
            </div>
          </a-form-item>
        </div>
      </div>

      <a-divider style="margin: 16px 0" />

      <!-- 8. 生效状态 -->
      <a-form-item label="生效状态" name="status">
        <a-space>
          <a-switch v-model:checked="formData.isEnabled" checked-children="开启" un-checked-children="关闭" />
          <span class="text-xs text-gray-500">
            {{ formData.isEnabled ? '开启后脱敏规则立即生效' : '关闭后该规则将暂停动态脱敏' }}
          </span>
        </a-space>
      </a-form-item>
    </a-form>

    <template #footer>
      <a-space>
        <a-button @click="handleClose">{{ readonly ? '关闭' : '取消' }}</a-button>
        <a-button v-if="!readonly" type="primary" :loading="submitting" @click="handleSubmit"> 确定保存 </a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { customInstance } from '@/api/mutator';
import type { MaskingRuleVO, DataCategoryVO } from '@/api/generated/data-security/schemas';

const props = defineProps<{
  visible: boolean;
  isEdit: boolean;
  readonly?: boolean;
  initialData?: MaskingRuleVO | null;
  categoryList: DataCategoryVO[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'success'): void;
}>();

const formRef = ref();
const submitting = ref(false);

const categoryTreeData = ref<any[]>([]);

watch(
  () => props.categoryList,
  list => {
    if (!list || list.length === 0) {
      categoryTreeData.value = [];
      return;
    }
    const rootNodes: any[] = [];
    const dirMap = new Map<string, any>();

    list.forEach(c => {
      const parts = ((c as any).categoryPath || c.categoryName || '').split('/').filter(Boolean);
      if (parts.length > 1) {
        const dirName = parts[0];
        if (!dirMap.has(dirName)) {
          const dirNode = {
            id: `dir_${dirName}`,
            value: `dir_${dirName}`,
            title: dirName,
            disabled: true,
            children: [] as any[],
          };
          dirMap.set(dirName, dirNode);
          rootNodes.push(dirNode);
        }
        dirMap.get(dirName).children.push({
          id: c.id,
          value: c.id,
          title: c.categoryName,
        });
      } else {
        rootNodes.push({
          id: c.id,
          value: c.id,
          title: c.categoryName,
        });
      }
    });

    categoryTreeData.value =
      rootNodes.length > 0 ? rootNodes : list.map(c => ({ id: c.id, value: c.id, title: c.categoryName }));
  },
  { immediate: true }
);

const formData = reactive({
  id: undefined as number | undefined,
  ruleName: '',
  description: '',
  categoryId: undefined as number | undefined,
  plateScopeType: 'ALL',
  selectedPlates: [] as string[],
  projectScopeType: 'ALL',
  selectedProjects: [] as string[],
  applyScenes: ['WRITE_DEV_TABLE', 'DATA_QUERY'] as string[],
  maskMethod: 'UNDERLYING',
  algorithmCategory: 'MASK',
  subAlgorithm: 'MASK_CUSTOM',
  maskKeyword: {
    regexPattern: '^(\\d{6})\\d+(\\d{4})$',
    replaceString: '$1********$2',
  },
  customMaskRanges: [{ start: 4, end: 7, maskChar: '****' }],
  hashSaltKey: '',
  cryptoConfig: {
    dictType: 'DIGIT_LETTER',
    customDict: '',
    tweak: 'YSS_TWEAK_SALT',
    rangeMode: 'ALL',
    rangeStart: 1,
    rangeEnd: 10,
    exceptionStrategy: 'NULL',
  },
  isEnabled: true,
});

const formRules: any = {
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择数据分类', trigger: 'change' }],
};

const onAlgorithmCategoryChange = (val: any) => {
  if (val === 'MASK') {
    formData.subAlgorithm = 'MASK_CUSTOM';
  } else if (val === 'HASH') {
    formData.subAlgorithm = 'HASH_SHA256';
    if (!formData.hashSaltKey) formData.hashSaltKey = 'YSS_SALT_KEY_2026';
  } else if (val === 'CRYPTO') {
    formData.subAlgorithm = 'CRYPTO_FPE_NATIVE';
  } else {
    formData.subAlgorithm = 'NULL_VALUE';
  }
};

const onSubAlgorithmChange = () => {
  // 联动逻辑
};

const addMaskRangeItem = () => {
  formData.customMaskRanges.push({ start: 1, end: 4, maskChar: '****' });
};

const removeMaskRangeItem = (index: number) => {
  if (formData.customMaskRanges.length > 1) {
    formData.customMaskRanges.splice(index, 1);
  }
};

watch(
  () => props.visible,
  val => {
    if (val) {
      if ((props.isEdit || props.readonly) && props.initialData) {
        const row = props.initialData;
        formData.id = row.id;
        formData.ruleName = row.ruleName || '';
        formData.description = (row as any).description || '';
        formData.categoryId = row.categoryId;
        formData.applyScenes = (row.applyScene || 'WRITE_DEV_TABLE,DATA_QUERY').split(',');
        formData.maskMethod = (row as any).maskMethod || 'UNDERLYING';
        formData.algorithmCategory = (row.algorithmType as any) || 'MASK';
        formData.subAlgorithm = (row as any).subAlgorithm || 'MASK_CUSTOM';
        formData.isEnabled = row.status === 'ENABLED' || row.status === 'ACTIVE';

        const plateStr = (row as any).plateScope || 'ALL';
        if (plateStr === 'ALL') {
          formData.plateScopeType = 'ALL';
          formData.selectedPlates = [];
        } else {
          formData.plateScopeType = 'CUSTOM';
          formData.selectedPlates = plateStr.split(',').filter(Boolean);
        }

        const projectStr = (row as any).projectScope || 'ALL';
        if (projectStr === 'ALL') {
          formData.projectScopeType = 'ALL';
          formData.selectedProjects = [];
        } else {
          formData.projectScopeType = 'CUSTOM';
          formData.selectedProjects = projectStr.split(',').filter(Boolean);
        }

        const params = (row.algorithmParams as any) || {};
        if (params.customMaskRanges) formData.customMaskRanges = params.customMaskRanges;
        if (params.maskKeyword) formData.maskKeyword = params.maskKeyword;
        if (params.hashSaltKey) formData.hashSaltKey = params.hashSaltKey;
        if (params.cryptoConfig) formData.cryptoConfig = params.cryptoConfig;
      } else {
        // 重置新建
        formData.id = undefined;
        formData.ruleName = '';
        formData.description = '';
        formData.categoryId = props.categoryList[0]?.id;
        formData.plateScopeType = 'ALL';
        formData.selectedPlates = [];
        formData.projectScopeType = 'ALL';
        formData.selectedProjects = [];
        formData.applyScenes = ['WRITE_DEV_TABLE', 'DATA_QUERY'];
        formData.maskMethod = 'UNDERLYING';
        formData.algorithmCategory = 'MASK';
        formData.subAlgorithm = 'MASK_CUSTOM';
        formData.customMaskRanges = [{ start: 4, end: 7, maskChar: '****' }];
        formData.hashSaltKey = 'YSS_SALT_KEY_2026';
        formData.cryptoConfig = {
          dictType: 'DIGIT_LETTER',
          customDict: '',
          tweak: 'YSS_TWEAK_SALT',
          rangeMode: 'ALL',
          rangeStart: 1,
          rangeEnd: 10,
          exceptionStrategy: 'NULL',
        };
        formData.isEnabled = true;
      }
    }
  }
);

const handleClose = () => {
  emit('update:visible', false);
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  if (formData.applyScenes.length === 0) {
    message.warning('请至少选择一个脱敏应用场景');
    return;
  }

  submitting.value = true;
  try {
    const algorithmParams: Record<string, any> = {};
    if (formData.algorithmCategory === 'MASK') {
      if (formData.subAlgorithm === 'MASK_KEYWORD') {
        algorithmParams.maskKeyword = formData.maskKeyword;
      } else {
        algorithmParams.customMaskRanges = formData.customMaskRanges;
      }
    } else if (formData.algorithmCategory === 'HASH') {
      algorithmParams.hashSaltKey = formData.hashSaltKey;
      algorithmParams.hashType = formData.subAlgorithm;
    } else if (formData.algorithmCategory === 'CRYPTO') {
      algorithmParams.cryptoConfig = formData.cryptoConfig;
    }

    const payload = {
      ruleName: formData.ruleName,
      categoryId: formData.categoryId,
      description: formData.description,
      algorithmType: formData.algorithmCategory,
      subAlgorithm: formData.subAlgorithm,
      algorithmParams,
      applyScene: formData.applyScenes.join(','),
      maskMethod: formData.maskMethod,
      plateScope: formData.plateScopeType === 'ALL' ? 'ALL' : formData.selectedPlates.join(','),
      projectScope: formData.projectScopeType === 'ALL' ? 'ALL' : formData.selectedProjects.join(','),
      status: formData.isEnabled ? 'ENABLED' : 'DISABLED',
    };

    if (props.isEdit && formData.id) {
      await customInstance({
        url: `/api/v1/masking-rules/${formData.id}`,
        method: 'PUT',
        data: payload,
      });
    } else {
      await customInstance({
        url: '/api/v1/masking-rules',
        method: 'POST',
        data: payload,
      });
    }

    message.success(props.isEdit ? '脱敏规则更新成功' : '动态脱敏规则创建成功');
    emit('update:visible', false);
    emit('success');
  } catch (err: any) {
    // handled by mutator
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped lang="less">
.method-option-card {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 10px 14px;
  transition: all 0.2s ease;
  background: #fafbfc;

  &.active {
    border-color: var(--ant-primary-color, #1677ff);
    background: var(--ant-primary-1, #f0f7ff);
  }
}

.algorithm-config-section {
  background: #fdfdfd;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 14px;

  .section-title {
    margin-bottom: 8px;
    .title-bold {
      font-size: 14px;
      font-weight: 600;
      color: #1f2329;
    }
  }

  .algorithm-subcard {
    background: #f7f9fa;
    border: 1px dashed #d9d9d9;
    border-radius: 4px;
    padding: 12px;
    margin-top: 10px;

    .range-item-row {
      margin-bottom: 8px;
      background: #ffffff;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid #eeeeee;
    }
  }
}
</style>
