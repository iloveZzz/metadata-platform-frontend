<template>
  <div class="security-grade-page">
    <YCard class-name="page-card">
      <!-- 顶部操作与检索区 -->
      <div class="header-toolbar">
        <div class="header-info">
          <div class="header-title-row">
            <SafetyCertificateOutlined class="title-icon text-primary" />
            <h2 class="header-title">数据分级</h2>
          </div>
          <p class="header-desc">数据分级用于定义数据在安全领域的安全等级。您可以在此创建及管理数据分级。</p>
        </div>
        <div class="header-actions">
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="根据数据分级名称关键字搜索"
            allow-clear
            class="search-input"
            style="width: 260px"
          />
          <YButton type="primary" size="middle" class="ml-3" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            新建数据分级
          </YButton>
          <YButton size="middle" class="ml-2" @click="fetchList">
            <template #icon><ReloadOutlined /></template>
            刷新
          </YButton>
        </div>
      </div>

      <!-- 分割线 -->
      <a-divider class="my-3" />

      <!-- 数据分级卡片网格 -->
      <a-spin :spinning="loading">
        <div v-if="filteredData && filteredData.length > 0" class="grade-card-grid">
          <a-row :gutter="[16, 16]">
            <a-col v-for="grade in filteredData" :key="grade.id" :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
              <div class="grade-card" :class="`border-color-${grade.colorTag || 'blue'}`">
                <!-- 卡片头部：等级、名称、敏感度 -->
                <div class="grade-card-header">
                  <div class="grade-badge-wrap">
                    <a-tag :color="grade.colorTag || getGradeTagColor(grade.gradeCode)" class="grade-code-tag">
                      {{ grade.gradeCode }}
                    </a-tag>
                    <span class="grade-name" :title="grade.gradeName">{{ grade.gradeName }}</span>
                  </div>
                  <div class="sensitivity-badge">
                    <a-tooltip :title="`敏感程度：${grade.sensitivityScore} / 100`">
                      <a-badge
                        :count="`${grade.sensitivityScore}分`"
                        :number-style="{
                          backgroundColor: getScoreBadgeColor(grade.sensitivityScore),
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }"
                      />
                    </a-tooltip>
                  </div>
                </div>

                <!-- 卡片内容：分级描述 -->
                <div class="grade-card-body">
                  <a-tooltip :title="grade.description || '暂无描述信息'">
                    <p class="grade-desc">
                      {{ grade.description || '暂无分级描述信息' }}
                    </p>
                  </a-tooltip>
                </div>

                <!-- 卡片元信息：缩写、更新人、更新时间 -->
                <div class="grade-card-meta">
                  <div class="meta-item">
                    <span class="meta-label">分级缩写：</span>
                    <span class="meta-value font-mono">{{ grade.gradeCode }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">更新人：</span>
                    <span class="meta-value">{{ grade.updatedBy || '-' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">更新时间：</span>
                    <span class="meta-value">{{ grade.updatedAt || '-' }}</span>
                  </div>
                </div>

                <!-- 卡片底部操作栏 -->
                <div class="grade-card-footer">
                  <a-button type="link" size="small" class="action-btn" @click="openEditModal(grade)">
                    <template #icon><EditOutlined /></template>
                    编辑
                  </a-button>
                  <a-divider type="vertical" />
                  <a-popconfirm
                    :title="`确定删除数据分级 [${grade.gradeName || grade.gradeCode}] 吗？若已被识别规则引用将不支持删除`"
                    ok-text="确认删除"
                    cancel-text="取消"
                    ok-type="danger"
                    @confirm="handleDelete(grade)"
                  >
                    <a-button type="link" danger size="small" class="action-btn">
                      <template #icon><DeleteOutlined /></template>
                      删除
                    </a-button>
                  </a-popconfirm>
                </div>
              </div>
            </a-col>
          </a-row>
        </div>

        <!-- 空态展示 -->
        <div v-else class="empty-wrap py-12">
          <a-empty :description="searchKeyword ? '未搜索到匹配的数据分级' : '暂无数据分级数据，请点击右上角新建'" />
        </div>
      </a-spin>
    </YCard>

    <!-- 新建/编辑数据分级对话框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEditMode ? '编辑数据分级' : '新建数据分级'"
      :confirm-loading="submitting"
      width="580px"
      @ok="handleModalSubmit"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical" class="grade-modal-form mt-4">
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="分级名称" name="gradeName">
              <a-input
                v-model:value="formData.gradeName"
                placeholder="请输入分级名称，支持中文、字母、数字或下划线(_)，≤128字符"
                :maxlength="128"
                show-count
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="分级缩写" name="gradeCode">
              <a-input
                v-model:value="formData.gradeCode"
                placeholder="例如：L1, L2，≤64字符"
                :maxlength="64"
                :disabled="isEditMode"
                show-count
              />
              <span v-if="isEditMode" class="text-xs text-gray-400">编辑模式下分级缩写不可变更</span>
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item label="敏感程度 (1~100)" name="sensitivityScore">
              <a-input-number
                v-model:value="formData.sensitivityScore"
                :min="1"
                :max="100"
                :precision="0"
                :disabled="isEditMode"
                style="width: 100%"
                placeholder="请输入1~100整数"
              />
              <span v-if="isEditMode" class="text-xs text-gray-400">编辑模式下敏感程度不可变更</span>
            </a-form-item>
          </a-col>

          <a-col :span="24">
            <a-form-item label="UI色彩标签" name="colorTag">
              <a-select v-model:value="formData.colorTag" placeholder="请选择色彩标签">
                <a-select-option value="blue">蓝色 (受限/内部)</a-select-option>
                <a-select-option value="green">绿色 (公开)</a-select-option>
                <a-select-option value="orange">橙色 (敏感)</a-select-option>
                <a-select-option value="red">红色 (高密/高危)</a-select-option>
                <a-select-option value="purple">紫色 (绝密)</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>

          <a-col :span="24">
            <a-form-item label="分级描述" name="description">
              <a-textarea
                v-model:value="formData.description"
                placeholder="请输入分级描述，支持中文、字母、数字或下划线(_)，≤2048字符"
                :rows="4"
                :maxlength="2048"
                show-count
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { message, type FormInstance } from 'ant-design-vue';
import type { RuleObject } from 'ant-design-vue/es/form';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue';
import { YCard, YButton } from '@yss-ui/components';
import { useSecurityGradeTable } from './hooks/useSecurityGradeTable';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import { getGradeTagColor, getGradeBadgeColor } from '@/utils';
import type { SecurityGradeVO } from '@/api/generated/data-security/schemas';
import './style.less';

defineOptions({ name: 'SecurityGradePage' });

const api = getDataSecurityCenterAPIAPIApi();

const { loading, searchKeyword, filteredData, fetchList, handleDelete } = useSecurityGradeTable();

const modalVisible = ref(false);
const isEditMode = ref(false);
const submitting = ref(false);
const currentEditId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const formData = reactive({
  gradeName: '',
  gradeCode: '',
  sensitivityScore: 50,
  colorTag: 'blue',
  description: '',
});

const NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
const DESC_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_\s]*$/;

const formRules: Record<string, RuleObject[]> = {
  gradeName: [
    { required: true, message: '请输入分级名称', trigger: 'blur' },
    { max: 128, message: '分级名称不超过128个字符', trigger: 'blur' },
    {
      pattern: NAME_PATTERN,
      message: '分级名称支持中文、字母、数字或下划线(_)',
      trigger: 'blur',
    },
  ],
  gradeCode: [
    { required: true, message: '请输入分级缩写', trigger: 'blur' },
    { max: 64, message: '分级缩写不超过64个字符', trigger: 'blur' },
    {
      pattern: NAME_PATTERN,
      message: '分级缩写支持中文、字母、数字或下划线(_)',
      trigger: 'blur',
    },
  ],
  sensitivityScore: [
    { required: true, message: '请输入敏感程度', trigger: 'change' },
    {
      type: 'integer',
      min: 1,
      max: 100,
      message: '敏感程度必须为1~100的整数',
      trigger: 'change',
    },
  ],
  description: [
    { max: 2048, message: '分级描述不超过2048个字符', trigger: 'blur' },
    {
      pattern: DESC_PATTERN,
      message: '分级描述支持中文、字母、数字或下划线(_)',
      trigger: 'blur',
    },
  ],
};

const getScoreBadgeColor = (score?: number) => getGradeBadgeColor(score);

const openCreateModal = () => {
  isEditMode.value = false;
  currentEditId.value = null;
  formData.gradeName = '';
  formData.gradeCode = '';
  formData.sensitivityScore = 50;
  formData.colorTag = 'blue';
  formData.description = '';
  modalVisible.value = true;
};

const openEditModal = (row: SecurityGradeVO) => {
  isEditMode.value = true;
  currentEditId.value = row.id!;
  formData.gradeName = row.gradeName || '';
  formData.gradeCode = row.gradeCode || '';
  formData.sensitivityScore = row.sensitivityScore || 50;
  formData.colorTag = row.colorTag || 'blue';
  formData.description = row.description || '';
  modalVisible.value = true;
};

const handleModalSubmit = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value && currentEditId.value) {
      await api.updateSecurityGrade(currentEditId.value, {
        gradeCode: formData.gradeCode,
        gradeName: formData.gradeName,
        sensitivityScore: formData.sensitivityScore,
        colorTag: formData.colorTag,
        description: formData.description,
      });
      message.success('数据分级更新成功');
    } else {
      await api.createSecurityGrade({
        gradeCode: formData.gradeCode,
        gradeName: formData.gradeName,
        sensitivityScore: formData.sensitivityScore,
        colorTag: formData.colorTag,
        description: formData.description,
      });
      message.success('数据分级创建成功');
    }
    modalVisible.value = false;
    fetchList();
  } catch (err: any) {
    message.error(err.response?.data?.message || err.message || '保存数据分级失败');
  } finally {
    submitting.value = false;
  }
};
</script>
