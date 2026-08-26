# YFormily 代码示例库

此文档提供了 YFormily 在业务中高频使用的完整代码示例。AI Agent 在编写代码时可直接参考或复用。

## 目录

1. [基础表单（含按钮组与布局）](#1-基础表单含按钮组与布局)
2. [动态禁用/显隐联动（使用 x-visible / x-disabled）](#2-动态禁用显隐联动)
3. [复杂逻辑联动（使用 x-reactions 函数）](#3-复杂逻辑联动)
4. [模式切换（0=新增 / 1=编辑 / 2=查看）](#4-模式切换新增--编辑--查看)
5. [自定义 Slot 插槽渲染](#5-自定义-slot-插槽渲染)
6. [分步表单 (FormStep)](#6-分步表单-formstep)

---

## 1. 基础表单（含按钮组与布局）

**特点**：标准的三层结构，使用 `GroupHeader` 分组，以及 `AutoButtonGroup` 统一按钮。

```vue
<template>
  <div style="padding: 24px;">
    <YFormily :schema="schema" :scope="{ onSubmit }" />
  </div>
</template>

<script setup lang="ts">
import { type ISchema, YssFormily } from '@yss-ui/components';
import { message } from 'ant-design-vue';

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            header1: {
              type: 'void',
              'x-component': 'GroupHeader',
              'x-component-props': {
                title: '基本信息',
                description: '带有一段描述',
              },
            },
            name: {
              type: 'string',
              title: '姓名',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '请输入' },
            },
            gender: {
              type: 'string',
              title: '性别',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              'x-component-props': {
                placeholder: '请选择',
                options: [
                  { label: '男', value: 'man' },
                  { label: '女', value: 'woman' },
                ],
              },
            },
            actions: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-decorator-props': { colon: false },
              'x-component': 'AutoButtonGroup',
              'x-component-props': { align: 'right' },
              properties: {
                reset: {
                  type: 'void',
                  'x-component': 'Reset',
                  'x-content': '重置',
                },
                submit: {
                  type: 'void',
                  'x-component': 'Submit',
                  'x-content': '提交',
                  'x-component-props': { onSubmit: '{{ onSubmit }}' },
                },
              },
            },
          },
        },
      },
    },
  },
};

const onSubmit = (values: Record<string, any>) => {
  console.log('values:', values);
  message.success('提交成功');
};
</script>
```

---

## 2. 动态禁用/显隐联动

**特点**：使用 `'x-visible'` 和 `'x-disabled'` 的表达式语法，依赖 `$values`。

```vue
<template>
  <YFormily :schema="schema" :initial-values="{ needCompany: false }" />
</template>

<script setup lang="ts">
import { type ISchema, YssFormily } from '@yss-ui/components';

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 100 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            needCompany: {
              type: 'boolean',
              title: '是否有工作',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
            },
            // 当 needCompany 为 true 时才显示
            companyName: {
              type: 'string',
              title: '公司名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': '{{ $values.needCompany === true }}',
            },
            // 某些条件下只读/禁用
            systemCode: {
              type: 'string',
              title: '系统编码',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-disabled': '{{ $values.needCompany === false }}',
            },
          },
        },
      },
    },
  },
};
</script>
```

---

## 3. 复杂逻辑联动

**特点**：使用 `'x-reactions'` 函数实现：修改其他字段的属性（如拉取下拉选项，并清除旧值）。

```vue
<template>
  <YFormily :schema="schema" />
</template>

<script setup lang="ts">
import { type ISchema, YssFormily } from '@yss-ui/components';

const mockCityData: Record<string, { label: string; value: string }[]> = {
  Zhejiang: [
    { label: 'Hangzhou', value: 'Hangzhou' },
    { label: 'Ningbo', value: 'Ningbo' },
  ],
  Jiangsu: [
    { label: 'Nanjing', value: 'Nanjing' },
    { label: 'Suzhou', value: 'Suzhou' },
  ],
};

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 100 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            province: {
              type: 'string',
              title: '省份',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              'x-component-props': {
                options: [
                  { label: '浙江', value: 'Zhejiang' },
                  { label: '江苏', value: 'Jiangsu' },
                ],
              },
            },
            city: {
              type: 'string',
              title: '城市',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              // 复杂联动：基于 province 更新 dataSource，并清空当前值
              'x-reactions': (field: any) => {
                // 找到 province 的值
                const provinceValue = field
                  .query('layout.grid.province')
                  .get('value');
                // 更新城市选项
                field.dataSource = provinceValue
                  ? mockCityData[provinceValue]
                  : [];
                // 如果选项为空或改变了省份，清空当前已选城市 (可根据需要在其他事件里做清空)
              },
            },
          },
        },
      },
    },
  },
};
</script>
```

---

## 4. 模式切换（新增 / 编辑 / 查看）

**特点**：根据 `mode`（0=新增/1=编辑/2=查看）切换表单状态，同时为查看态配置 `detail-as="descriptions"`。

```vue
<template>
  <div style="margin-bottom: 16px;">
    <a-radio-group v-model:value="mode">
      <a-radio-button :value="0">新增模式</a-radio-button>
      <a-radio-button :value="1">编辑模式</a-radio-button>
      <a-radio-button :value="2">查看模式</a-radio-button>
    </a-radio-group>
  </div>

  <YFormily
    :key="mode"
    :schema="schema"
    :initial-values="initialValues"
    :mode="mode"
    detail-as="descriptions"
    :detail-options="{ bordered: true, maxColumns: 2 }"
    :scope="{ dicts }"
  >
    <!-- 编辑插槽 -->
    <template #customSlot="{ value, onChange }">
      <a-input
        :value="value"
        style="width: 150px; border-color: red"
        @update:value="onChange"
      />
    </template>

    <!-- 查看插槽（自动替换 . 为 -） -->
    <template #detail-customField="{ value }">
      <span style="color: red; font-weight: bold">{{ value }}</span>
    </template>
  </YFormily>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { type ISchema, YssFormily } from '@yss-ui/components';

const mode = ref(0); // 0=新增 1=编辑 2=查看

// 远程字典
const dicts = {
  statusOptions: [
    { label: '开启', value: 'ON' },
    { label: '关闭', value: 'OFF' },
  ],
};

// 初始值根据模式改变
const initialValues = computed(() => {
  if (mode.value === 0) return { status: 'ON' }; // 新增时给默认值
  return { name: '张三', status: 'ON', customField: '特殊内容' }; // 编辑/查看传入数据
});

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 100 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            name: {
              type: 'string',
              title: '姓名',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
            status: {
              type: 'string',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: '{{ dicts.statusOptions }}', // 使用 scope 注入
            },
            customField: {
              type: 'string',
              title: '自定义内容',
              'x-decorator': 'FormItem',
              'x-component': 'Slot',
              'x-component-props': { name: 'customSlot' },
            },
          },
        },
      },
    },
  },
};
</script>
```

---

## 5. 自定义 Slot 插槽渲染

**特点**：在 Schema 中使用 `x-component: 'Slot'` 并配置 `name`。可以通过 `params` 注入 `$values` 拿到全部数据。

```vue
<template>
  <YFormily :schema="schema">
    <!-- value/onChange 总是默认传递的；field 和 values 是通过 params 注入的 -->
    <template #userSelector="{ value, onChange, field, values }">
      <div style="display: flex; gap: 8px">
        <a-input
          :value="value"
          readonly
          @click="openModal(onChange)"
          placeholder="点击选择用户"
        />
        <a-button v-if="value" @click="onChange(undefined)">清除</a-button>
        <span style="color: #999"
          >当前分类: {{ values?.category || '无' }}</span
        >
      </div>
    </template>
  </YFormily>
</template>

<script setup lang="ts">
import { type ISchema, YssFormily } from '@yss-ui/components';

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            category: {
              type: 'string',
              title: '分类',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
            userId: {
              type: 'string',
              title: '关联用户',
              'x-decorator': 'FormItem',
              'x-component': 'Slot',
              'x-component-props': {
                name: 'userSelector',
                params: ['field', '$values'], // 额外透传场和完整表单值
              },
            },
          },
        },
      },
    },
  },
};

const openModal = (setVal: (v: string) => void) => {
  // 模拟弹窗选人
  setTimeout(() => setVal('User_' + Date.now()), 500);
};
</script>
```

---

## 6. 分步表单 (FormStep)

**特点**：需通过 `@formily/antdv` 导入 `FormStep.createFormStep()`。通过 formStep 实例控制前后步，Schema 中按步骤布局 `FormStep.StepPane`。

```vue
<template>
  <div style="padding: 24px;">
    <!-- 第一步：横向步骤条展示 -->
    <a-steps :current="formStep.current" style="margin-bottom: 24px">
      <a-step title="基本配置" />
      <a-step title="高级策略" />
      <a-step title="完成" />
    </a-steps>

    <!-- 表单本体。不要忘记传入 scope 包含 formStep 实例！ -->
    <YssFormily :schema="schema" :scope="{ formStep }" />

    <!-- 底部按钮区：通过 formStep 的状态计算显隐 -->
    <div style="margin-top: 16px; text-align: right;">
      <a-button
        :disabled="!formStep.allowBack"
        @click="formStep.back()"
        style="margin-right: 8px"
        >上一步</a-button
      >
      <a-button
        type="primary"
        :disabled="!formStep.allowNext"
        @click="formStep.next()"
        style="margin-right: 8px"
        >下一步</a-button
      >
      <a-button
        type="primary"
        :disabled="formStep.allowNext"
        @click="formStep.submit(onSubmit)"
        >提交</a-button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { type ISchema, YssFormily } from '@yss-ui/components';
import { FormStep } from '@formily/antdv';
import { message } from 'ant-design-vue';

// 创建分步实例
const formStep = FormStep.createFormStep();

// 步骤表单的 schema：使用 FormStep 容器，内部为 StepPane
const schema: ISchema = {
  type: 'object',
  properties: {
    steps: {
      type: 'void',
      'x-component': 'FormStep',
      'x-component-props': { formStep: '{{ formStep }}' }, // 注入实力
      properties: {
        step1: {
          type: 'void',
          'x-component': 'FormStep.StepPane', // 第一个窗格
          properties: {
            fieldA: {
              type: 'string',
              title: '基础字段A',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
          },
        },
        step2: {
          type: 'void',
          'x-component': 'FormStep.StepPane', // 第二个窗格
          properties: {
            fieldB: {
              type: 'string',
              title: '高级字段B',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
          },
        },
        step3: {
          type: 'void',
          'x-component': 'FormStep.StepPane', // 第三个窗格
          properties: {
            fieldC: {
              type: 'string',
              title: '附加备注',
              'x-decorator': 'FormItem',
              'x-component': 'Input.TextArea',
            },
          },
        },
      },
    },
  },
};

const onSubmit = (values: any) => {
  console.log('提交最终数据:', values);
  message.success('创建成功');
};
</script>
```

---

## 7. 动态表单与动态插槽 (Dynamic Schema + Slots)

**特点**：此场景常见于与后端约定动态化表单配置（如根据所选“数据源”、“规则模板”返回配置对象）。前端需要动态解析生成 YFormily Schema，并在模板中使用 `v-for` 渲染动态命名的插槽（如 `input-code` 渲染为 `YMonaco`）。

```vue
<template>
  <div style="padding: 24px;">
    <YssFormily
      ref="formRefTem"
      v-model="initialValues"
      :schema="schemaTem"
      :grid-defaults="{ maxColumns: 1 }"
    >
      <!-- 动态插槽：遍历提取出的所有插槽字段名，利用 #[name] 语法注入自定义组件 -->
      <template
        v-for="fieldKey in codeEditorFields"
        :key="fieldKey"
        #[`${fieldKey}Slot`]="{ value, onChange }"
      >
        <YMonaco
          :value="value"
          @change="onChange"
          :height="130"
          language="sql"
        />
      </template>
    </YssFormily>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { type ISchema, YssFormily, YMonaco } from '@yss-ui/components';

const formRefTem = ref();
const initialValues = ref<Record<string, any>>({});

// 1. 初始化容器 Schema，包含最基础的布局结构
const schemaTem = ref<ISchema>({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            header1: {
              type: 'void',
              title: '模板配置',
              'x-decorator': 'FormItem',
              'x-decorator-props': { feedbackLayout: 'none', colon: false },
              'x-component': 'GroupHeader',
            },
            // 此处的其余 properties 将由动态生成覆盖
          },
        },
      },
    },
  },
});

// 2. 模拟后端返回的动态配置描述数组
const mockPluginParams = [
  { field: 'tableName', name: '表名', type: 'string', required: true },
  { field: 'isEnable', name: '是否启用', type: 'boolean' },
  { field: 'customSql', name: '自定义SQL', type: 'input-code', required: true },
];

// 3. 将后端配置转化为 Formily properties 的方法
const generateDynamicSchema = (pluginParams: any[]) => {
  // 基础固定属性，为了保持分组展示
  const properties: Record<string, any> = {
    header1: {
      type: 'void',
      title: '参数配置',
      'x-decorator': 'FormItem',
      'x-decorator-props': { feedbackLayout: 'none', colon: false },
      'x-component': 'GroupHeader',
    },
  };

  pluginParams.forEach(param => {
    const fieldKey = param.field;
    if (!fieldKey) return;

    // 根据自定义类型推断映射组件
    const isCodeEditor = param.type === 'input-code';
    let componentName = 'Input';
    let schemaType = 'string';

    if (param.type === 'boolean') {
      componentName = 'Switch';
      schemaType = 'boolean';
    } else if (isCodeEditor) {
      componentName = 'Slot';
    }

    properties[fieldKey] = {
      type: schemaType,
      title: param.name,
      'x-decorator': 'FormItem',
      'x-component': componentName,
      required: !!param.required,
    };

    // 如果是动态插槽，需要设置 Slot Name 并透传 params
    if (isCodeEditor) {
      properties[fieldKey]['x-component-props'] = {
        name: `${fieldKey}Slot`,
        params: ['field'], // 按需透传
      };
    } else {
      // 如果是一般组件，可在这里统一补充 onChange 事件等属性
      properties[fieldKey]['x-component-props'] = {
        placeholder: `请输入或选择 ${param.name}`,
        onChange: () => {
          // 清除之前可能的校验错误缓存，增加用户体验
          formRefTem.value?.setFieldState?.(fieldKey, (state: any) => {
            state.errors = [];
          });
        },
      };
    }
  });

  return properties;
};

// 4. 计算属性：从当前 Schema 中提取出所有需要自定义 Slot 渲染的 field 集合，提供给模板内部的 v-for
const codeEditorFields = computed(() => {
  const gridProps =
    schemaTem.value?.properties?.layout?.properties?.grid?.properties || {};
  const fields: string[] = [];

  Object.keys(gridProps).forEach(key => {
    const field: any = gridProps[key];
    if (
      field['x-component'] === 'Slot' &&
      field['x-component-props']?.name?.endsWith('Slot')
    ) {
      fields.push(key);
    }
  });

  return fields;
});

// 5. 模拟挂载时获取动态参数并渲染
onMounted(() => {
  // ① 动态生成节点对象
  const newProperties = generateDynamicSchema(mockPluginParams);

  // ② 直接替换或覆盖 schema container 下的 properties
  if (schemaTem.value?.properties?.layout?.properties?.grid?.properties) {
    // 保留引用并重新赋值
    const gridProps = schemaTem.value.properties.layout.properties.grid
      .properties as any;
    // 先清空旧的再塞新的，或者直接进行替换
    for (const key in gridProps) {
      delete gridProps[key];
    }
    Object.assign(gridProps, newProperties);
  }
});
</script>
```
