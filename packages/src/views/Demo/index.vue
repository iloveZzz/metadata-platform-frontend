<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { YTableColumn } from '@yss-ui/components';
import { useTableHeight } from '@yss-ui/hooks';

defineOptions({ name: 'TableDemo' });

const schema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 90 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          // 默认三列，具备响应式能力：窄屏降级为两列/一列
          // 'x-component-props': { maxColumns: 3, minColumns: 1, columnGap: 16, rowGap: 0, minWidth: 260 },
          properties: {
            userType: {
              type: 'string',
              title: '用户类型',
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: [
                { label: '个人', value: 'personal' },
                { label: '企业', value: 'company' },
              ],
              'x-decorator-props': { gridSpan: 1 },
            },
            name: {
              type: 'string',
              title: '姓名',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'personal' }}",
              'x-decorator-props': { gridSpan: 2 },
            },
            companyName: {
              type: 'string',
              title: '公司名称',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'company' }}",
              'x-decorator-props': { gridSpan: 2 },
            },
            age: {
              type: 'number',
              title: '年龄',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-disabled': '{{ $values.status === false }}',
              'x-decorator-props': { gridSpan: 1 },
            },
            status: {
              type: 'boolean',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-decorator-props': { gridSpan: 1 },
            },
            actions: {
              type: 'void',
              // 关键：使用 FormItem 参与布局与对齐
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 1, colon: false },
              'x-component': 'AutoButtonGroup',
              properties: {
                submit: { type: 'void', 'x-component': 'Submit', 'x-content': '查询' },
                reset: { type: 'void', 'x-component': 'Reset', 'x-content': '重置' },
              },
            },
          },
        },
      },
    },
  },
};

const pagination = ref({ current: 1, pageSize: 5, total: 0, showSizeChanger: true });

const columns = reactive<YTableColumn[]>([
  { type: 'seq' as const, title: '序号', width: 60, align: 'center' as const },
  { field: 'name', title: '姓名', width: 120 },
  { field: 'age', title: '年龄', width: 80, align: 'center' as const },
  { field: 'gender', title: '性别', width: 80, align: 'center' as const },
]);

const tableData = ref([
  { _X_ROW_KEY: '1', name: '张三', age: 28, gender: '男', isAudt: false },
  { _X_ROW_KEY: '2', name: '李四', age: 22, gender: '男', isAudt: true },
  { _X_ROW_KEY: '3', name: '王五', age: 26, gender: '女', isAudt: false },
  { _X_ROW_KEY: '4', name: '赵六', age: 30, gender: '男', isAudt: false },
]);

const tableRef = ref();
const { tableHeight } = useTableHeight(tableRef, { withPagination: true });

// 顶层操作列配置（与旧库用法一致）
const actionConfig = reactive({
  width: 180,
  align: 'left',
  fixed: 'right',
  displayLimit: 2,
  moreRenderType: 'moreButton',
  buttons: [
    {
      text: '查看',
      key: 'view',
      type: 'link',
      clickFn: ({ row }: any) => alert(`查看：${row.name}`),
      disabledFn: ({ rowIndex }: any) => rowIndex % 2 === 0,
    },
    {
      text: '编辑',
      key: 'hide',
      type: 'text',
      hideFn: ({ rowIndex }: any) => rowIndex % 2 === 0,
      clickFn: ({ row }: any) => alert(`隐藏：${row.name}`),
    },
    {
      text: '删除',
      key: 'delete',
      type: 'text',
      isConfirm: true,
      confirmProps: { title: '是否确认删除此条数据？', needLoading: true },
      clickFn: async ({ row }: any, _btn: any, { hideLoading, close }: any) => {
        await new Promise(r => setTimeout(r, 1000));
        const idx = tableData.value.findIndex(i => i._X_ROW_KEY === row._X_ROW_KEY);
        if (idx > -1) tableData.value.splice(idx, 1);
        hideLoading();
        close();
        alert('删除成功');
      },
    },
  ],
});
</script>

<template>
  <y-card class="demo-container">
    <y-formily ref="formRef" :schema="schema" :initial-values="{ userType: 'personal', status: true }" />
    <div ref="tableRef" class="table-container-demo">
      <YTable
        v-model:pagination="pagination"
        :data="tableData"
        :columns="columns"
        :pageable="true"
        :max-height="tableHeight"
        :action-config="actionConfig"
        :show-action-column="true"
      />
    </div>
  </y-card>
</template>

<style scoped lang="less">
.demo-container {
  height: 100%;
  background-color: #fff;

  :deep(.ant-card-body) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

.table-container-demo {
  flex: 1;
}
</style>
