<template>
  <div class="static-masking-view">
    <!-- ① 静态脱敏 4 步操作指引 Banner -->
    <StaticMaskingGuideBanner
      @configure-package="activeSubTab = 'packages'"
      @view-algorithms="activeSubTab = 'functions'"
      @test-algorithm="openTestModal()"
      @view-sql="openSqlDrawer()"
    />

    <!-- 主体内容卡片区 -->
    <YCard class-name="page-card content-card" :bordered="false">
      <!-- 顶部子 Tab 与快捷操作栏 -->
      <div class="sub-tab-header">
        <div class="sub-tabs-left">
          <a-radio-group v-model:value="activeSubTab" button-style="solid">
            <a-radio-button value="functions">脱敏算法函数库</a-radio-button>
            <a-radio-button value="packages">项目算法包管理</a-radio-button>
          </a-radio-group>
        </div>

        <div class="sub-actions-right">
          <a-button @click="openTestModal()">
            <template #icon><ExperimentOutlined /></template>
            算法在线试算
          </a-button>
          <a-button @click="openSqlDrawer()">
            <template #icon><CodeOutlined /></template>
            SQL 任务示例
          </a-button>
          <a-button type="primary" @click="openInstallModal()">
            <template #icon><AppstoreAddOutlined /></template>
            安装算法包
          </a-button>
          <a-tooltip title="刷新列表">
            <a-button @click="refreshActiveTable">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </a-tooltip>
        </div>
      </div>

      <!-- 子视图：算法函数库 -->
      <StaticAlgorithmTable
        v-if="activeSubTab === 'functions'"
        ref="algoTableRef"
        @open-test="openTestModal()"
        @open-sql="func => openSqlDrawer(func)"
        @test-function="func => openTestModal(func)"
      />

      <!-- 子视图：项目算法包管理 -->
      <ProjectPackageTable
        v-else-if="activeSubTab === 'packages'"
        ref="pkgTableRef"
        @open-install="projId => openInstallModal(projId)"
      />
    </YCard>

    <!-- 算法在线测试弹窗 -->
    <AlgorithmTestModal v-model:open="testModalVisible" :initial-function="selectedTestFunction" />

    <!-- SQL 代码示例抽屉 -->
    <SqlSnippetDrawer v-model:open="sqlDrawerVisible" :target-function="selectedSqlFunction" />

    <!-- 项目算法包安装弹窗 -->
    <InstallPackageModal
      v-model:open="installModalVisible"
      :initial-project="selectedInstallProject"
      @success="handleInstallSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ExperimentOutlined, CodeOutlined, AppstoreAddOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import { YCard } from '@yss-ui/components';
import StaticMaskingGuideBanner from './StaticMaskingGuideBanner.vue';
import StaticAlgorithmTable from './StaticAlgorithmTable.vue';
import ProjectPackageTable from './ProjectPackageTable.vue';
import AlgorithmTestModal from './AlgorithmTestModal.vue';
import SqlSnippetDrawer from './SqlSnippetDrawer.vue';
import InstallPackageModal from './InstallPackageModal.vue';

const activeSubTab = ref('functions');

const algoTableRef = ref();
const pkgTableRef = ref();

// 测试弹窗
const testModalVisible = ref(false);
const selectedTestFunction = ref('sec_mask_phone');
const openTestModal = (func?: string) => {
  if (func) {
    selectedTestFunction.value = func;
  }
  testModalVisible.value = true;
};

// SQL 示例抽屉
const sqlDrawerVisible = ref(false);
const selectedSqlFunction = ref<string | undefined>(undefined);
const openSqlDrawer = (func?: string) => {
  selectedSqlFunction.value = func;
  sqlDrawerVisible.value = true;
};

// 安装包弹窗
const installModalVisible = ref(false);
const selectedInstallProject = ref('');
const openInstallModal = (projId?: string) => {
  selectedInstallProject.value = projId || 'prj_marketing';
  installModalVisible.value = true;
};

const handleInstallSuccess = () => {
  if (pkgTableRef.value) {
    pkgTableRef.value.fetchList();
  }
};

const refreshActiveTable = () => {
  if (activeSubTab.value === 'functions' && algoTableRef.value) {
    algoTableRef.value.fetchList();
  } else if (activeSubTab.value === 'packages' && pkgTableRef.value) {
    pkgTableRef.value.fetchList();
  }
};
</script>

<style scoped lang="less">
.static-masking-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  .sub-tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .sub-tabs-left {
      display: flex;
      align-items: center;
    }

    .sub-actions-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}
</style>
