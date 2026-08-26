<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { PlusOutlined, SettingOutlined, ProfileOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { YTable } from '@yss-ui/components';
import {
  listSecurityTemplates,
  createSecurityTemplate,
  updateSecurityTemplate,
  getSecurityTemplateDetail,
  type SecurityTemplateVO,
} from '@/api/smartGovernance';

defineOptions({ name: 'SecurityTemplates' });

const loading = ref(false);
const templates = ref<SecurityTemplateVO[]>([]);
const searchKeyword = ref('');

// 抽屉详情
const drawerVisible = ref(false);
const currentTemplate = ref<SecurityTemplateVO | null>(null);

// 创建弹窗
const createModalVisible = ref(false);
const createForm = reactive({
  templateCode: '',
  templateName: '',
  standardAuthority: '',
  description: '',
  defaultAutoApproval: true,
  defaultThreshold: 0.95,
});

const fetchTemplates = async () => {
  loading.value = true;
  try {
    const res = await listSecurityTemplates(searchKeyword.value);
    if (res?.data) {
      templates.value = res.data;
    }
  } catch (err) {
    message.error('加载合规模板列表失败');
  } finally {
    loading.value = false;
  }
};

const handleViewDetail = async (record: SecurityTemplateVO) => {
  try {
    const res = await getSecurityTemplateDetail(record.id);
    if (res?.data) {
      currentTemplate.value = res.data;
      drawerVisible.value = true;
    }
  } catch (err) {
    message.error('加载模板详情失败');
  }
};

const openCreateModal = () => {
  createForm.templateCode = '';
  createForm.templateName = '';
  createForm.standardAuthority = '全国金融标准化技术委员会';
  createForm.description = '';
  createForm.defaultAutoApproval = true;
  createForm.defaultThreshold = 0.95;
  createModalVisible.value = true;
};

const submitCreate = async () => {
  if (!createForm.templateCode || !createForm.templateName) {
    message.warning('请填写模板编码与名称');
    return;
  }
  try {
    await createSecurityTemplate(createForm);
    message.success('合规模板创建成功');
    createModalVisible.value = false;
    fetchTemplates();
  } catch (err) {
    message.error('模板创建失败');
  }
};

const handleToggleActive = async (template: SecurityTemplateVO) => {
  try {
    await updateSecurityTemplate(template.id, {
      templateName: template.templateName,
      isActive: !template.isActive,
    });
    message.success(`模板状态已${template.isActive ? '停用' : '启用'}`);
    fetchTemplates();
  } catch (err) {
    message.error('状态更新失败');
  }
};

onMounted(() => {
  fetchTemplates();
});
</script>

<template>
  <div class="templates-page">
    <!-- Header -->
    <a-card :bordered="false" class="header-card">
      <div class="header-flex">
        <div>
          <h2>行业合规模板管理</h2>
          <p class="subtitle">
            预置并维护金融行业（JR/T 0197-2020）、个人信息保护法（PIPL）及企业自研安全分类分级标准与三层漏斗规则。
          </p>
        </div>
        <a-button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新建行业模板
        </a-button>
      </div>
    </a-card>

    <!-- Template Grid -->
    <div class="template-grid">
      <a-card
        v-for="tpl in templates"
        :key="tpl.id"
        :bordered="false"
        class="tpl-card"
        :class="{ 'tpl-card--active': tpl.isActive }"
      >
        <template #title>
          <div class="tpl-title">
            <span>{{ tpl.templateName }}</span>
            <a-tag v-if="tpl.isSystemBuiltIn" color="blue">内置标准</a-tag>
            <a-tag v-else color="purple">企业自定义</a-tag>
          </div>
        </template>
        <template #extra>
          <a-switch
            :checked="tpl.isActive"
            checked-children="启用"
            un-checked-children="停用"
            @change="handleToggleActive(tpl)"
          />
        </template>

        <p class="tpl-desc">{{ tpl.description || '按国家/行业权威发布的数据安全分级分类技术指南建立的规则基线。' }}</p>

        <div class="tpl-meta">
          <div class="meta-row">
            <span class="meta-label">标准编码:</span>
            <code>{{ tpl.templateCode }}</code>
          </div>
          <div class="meta-row">
            <span class="meta-label">制定机构:</span>
            <span>{{ tpl.standardAuthority || '中国人民银行 / 金标委' }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">自动生效阈值:</span>
            <span>置信度 &ge; {{ (tpl.defaultThreshold * 100).toFixed(0) }}% 自动生效</span>
          </div>
        </div>

        <template #actions>
          <span @click="handleViewDetail(tpl)"> <ProfileOutlined /> 规则规则项 ({{ tpl.rules?.length || 12 }}) </span>
          <span @click="handleViewDetail(tpl)"> <SettingOutlined /> 参数配置 </span>
        </template>
      </a-card>
    </div>

    <!-- Template Detail Drawer -->
    <a-drawer
      v-model:open="drawerVisible"
      :title="`合规模板规则明细: ${currentTemplate?.templateName}`"
      :width="680"
      :destroy-on-close="true"
    >
      <div v-if="currentTemplate" class="drawer-body">
        <a-descriptions title="模板基线配置" :column="2" bordered size="small">
          <a-descriptions-item label="标准编号">{{ currentTemplate.templateCode }}</a-descriptions-item>
          <a-descriptions-item label="权威发布机构">{{ currentTemplate.standardAuthority }}</a-descriptions-item>
          <a-descriptions-item label="自动采纳策略">
            {{ currentTemplate.defaultAutoApproval ? '高置信度直接生效' : '全部人工复核' }}
          </a-descriptions-item>
          <a-descriptions-item label="自动化阈值">
            {{ (currentTemplate.defaultThreshold * 100).toFixed(0) }}%
          </a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <h3>内置三层漏斗规则清单</h3>
        <YTable
          :data="currentTemplate.rules || []"
          :row-config="{ keyField: 'id', useKey: true }"
          :pageable="false"
          :columns="[
            { title: '敏感数据类型', field: 'sensitiveName' },
            { title: '安全等级', field: 'securityLevel', width: 90, slots: { default: 'securityLevel' } },
            { title: '正则表达式/字典', field: 'regexPattern', slots: { default: 'regexPattern' } },
            { title: '标准条款引用', field: 'clauseRef' },
          ]"
        >
          <template #securityLevel="{ row }">
            <a-tag color="red">{{ row.securityLevel }}</a-tag>
          </template>
          <template #regexPattern="{ row }">
            <code>{{ row.regexPattern || row.dictionaryWords || 'L3大模型语义推理' }}</code>
          </template>
        </YTable>
      </div>
    </a-drawer>

    <!-- Create Modal -->
    <a-modal
      v-model:open="createModalVisible"
      title="新建行业合规模板"
      ok-text="确认创建"
      cancel-text="取消"
      @ok="submitCreate"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="模板编码" required>
          <a-input v-model:value="createForm.templateCode" placeholder="如 JR_T_0197_2020 或 CUSTOM_PIPL" />
        </a-form-item>
        <a-form-item label="模板名称" required>
          <a-input v-model:value="createForm.templateName" placeholder="如 金融数据安全分级指南" />
        </a-form-item>
        <a-form-item label="制定/发布权威机构">
          <a-input v-model:value="createForm.standardAuthority" placeholder="如 全国金融标准化技术委员会" />
        </a-form-item>
        <a-form-item label="模板说明">
          <a-textarea v-model:value="createForm.description" :rows="3" placeholder="填写模板适用业务域及标准背景" />
        </a-form-item>
        <a-form-item label="自动生效置信度阈值 (0.0 ~ 1.0)">
          <a-input-number
            v-model:value="createForm.defaultThreshold"
            :min="0.5"
            :max="1.0"
            :step="0.05"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.templates-page {
  padding: 16px;
  background: #f0f2f5;
  min-height: 100vh;
}
.header-card {
  margin-bottom: 16px;
  border-radius: 8px;
}
.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.subtitle {
  color: #8c8c8c;
  margin: 4px 0 0 0;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}
.tpl-card {
  border-radius: 8px;
  transition: all 0.3s;
}
.tpl-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.tpl-card--active {
  border-top: 3px solid #1890ff;
}
.tpl-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.tpl-desc {
  color: #595959;
  font-size: 13px;
  min-height: 40px;
}
.tpl-meta {
  background: #fafafa;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.meta-row {
  display: flex;
  justify-content: space-between;
}
.meta-label {
  color: #8c8c8c;
}
</style>
