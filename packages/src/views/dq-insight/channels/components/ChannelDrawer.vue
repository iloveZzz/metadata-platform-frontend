<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { YssFormily, type ISchema } from '@yss-ui/components';
import type { Channel, ChannelCreateRequest, ChannelUpdateRequest } from '@/api';
import { customMessage } from '@/utils/message';

defineOptions({ name: 'ChannelDrawer' });

const props = withDefaults(
  defineProps<{
    /** 抽屉可见性 */
    open: boolean;
    /** create=新建（空态主操作）；edit=配置（通道列表操作列） */
    mode: 'create' | 'edit';
    /** edit 模式当前通道 */
    channel?: Channel | null;
    /** 已加载通道列表（重名预检，409 幂等拒绝语义） */
    channels: Channel[];
  }>(),
  {
    channel: null,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  /** dirty-form：表单已修改时关闭 / 取消，由页面二次确认（离开确认，状态矩阵 §3 dirty-form） */
  (e: 'dirty-close'): void;
  (e: 'save', payload: { create?: ChannelCreateRequest; update?: ChannelUpdateRequest }): void;
}>();

const formRef = ref();
const dirty = ref(false);
const submitting = ref(false);

/** 目标数据域候选（冻结契约无字典接口，MVP 静态候选，与高保真原型一致） */
const DOMAIN_OPTIONS = ['交易域', '客户域', '财务域', '公共域', '风控域'];

const initialValues = computed(() => {
  if (props.mode === 'edit' && props.channel) {
    return {
      name: props.channel.name ?? '',
      type: props.channel.type ?? 'scheduled-pull',
      schedule: props.channel.schedule || undefined,
      formatType: props.channel.formatType ?? 'ge',
      authToken: '',
      domain: props.channel.domain || undefined,
    };
  }
  return {
    name: '',
    type: 'scheduled-pull',
    schedule: '每日 02:00',
    formatType: 'ge',
    authToken: '',
    domain: undefined,
    enabled: true,
  };
});

/** YssFormily schema（类型 / 周期 / 格式 / 认证 Token / 目标数据域；创建态含「创建后启用」） */
const schema = computed<ISchema>(() => {
  const fields: Record<string, ISchema> = {
    name: {
      type: 'string',
      title: '通道名称',
      required: true,
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': { placeholder: '例如：财务域 GaussDB 拉取' },
    } as ISchema,
    type: {
      type: 'string',
      title: '通道类型',
      required: true,
      enum: ['api-push', 'scheduled-pull'],
      'x-decorator': 'FormItem',
      'x-component': 'Radio.Group',
      'x-component-props': { optionType: 'button' },
    } as ISchema,
    schedule: {
      type: 'string',
      title: '拉取周期',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: ['每日 02:00', '每小时', '每 15 分钟', '手动'],
      'x-component-props': { placeholder: '仅定时拉取通道生效' },
      'x-reactions': {
        dependencies: ['type'],
        fulfill: {
          state: {
            visible: '{{$deps[0] === "scheduled-pull"}}',
            disabled: '{{$deps[0] !== "scheduled-pull"}}',
          },
        },
      },
    } as ISchema,
    formatType: {
      type: 'string',
      title: '格式类型',
      required: true,
      enum: ['ge', 'csv', 'api'],
      'x-decorator': 'FormItem',
      'x-component': 'Select',
    } as ISchema,
    authToken: {
      type: 'string',
      title: '认证 Token',
      'x-decorator': 'FormItem',
      'x-component': 'Password',
      'x-component-props': { placeholder: 'Token / AK/SK（加密存储，SB-09）' },
    } as ISchema,
    domain: {
      type: 'string',
      title: '目标数据域',
      'x-decorator': 'FormItem',
      'x-component': 'Select',
      enum: DOMAIN_OPTIONS,
      'x-component-props': { allowClear: true, placeholder: '默认全数据域' },
    } as ISchema,
  };
  if (props.mode === 'create') {
    fields.enabled = {
      type: 'boolean',
      title: '创建后启用',
      'x-decorator': 'FormItem',
      'x-component': 'Switch',
    } as ISchema;
  }
  return {
    type: 'object',
    properties: {
      layout: {
        type: 'void',
        'x-component': 'FormLayout',
        'x-component-props': { layout: 'vertical' },
        properties: fields,
      } as ISchema,
    },
  } as ISchema;
});

watch(
  () => props.open,
  open => {
    if (open) {
      formRef.value?.setValues(initialValues.value);
      dirty.value = false;
    }
  }
);

const onValuesChange = () => {
  if (props.open) {
    dirty.value = true;
  }
};

/** 关闭 / 取消：dirty 时交给页面二次确认 */
const handleClose = () => {
  if (dirty.value) {
    emit('dirty-close');
    return;
  }
  emit('close');
};

/** 保存：submit 校验通过 → 重名预检 → 提交 payload */
const handleSave = async () => {
  if (submitting.value) {
    return;
  }
  submitting.value = true;
  try {
    await formRef.value?.submit();
    const values = formRef.value?.getValues() ?? {};

    // 重名预检（409 幂等拒绝；edit 排除自身）
    const dup = props.channels.some(c => c.name === values.name && c.id !== props.channel?.id);
    if (dup) {
      customMessage.error(`通道名「${values.name}」已存在（409 幂等拒绝），请修改后重试`);
      return;
    }

    // 周期校验（仅定时拉取必填，schema 不强制以支持 api-push）
    if (values.type === 'scheduled-pull' && !values.schedule) {
      customMessage.error('请选择拉取周期（仅定时拉取通道生效）');
      return;
    }

    const base = {
      name: values.name,
      type: values.type,
      schedule: values.type === 'scheduled-pull' ? values.schedule : undefined,
      formatType: values.formatType,
      domain: values.domain || undefined,
      authToken: values.authToken ? String(values.authToken) : undefined,
    };

    if (props.mode === 'create') {
      emit('save', { create: { ...base, enabled: values.enabled ?? true } });
    } else {
      const update: ChannelUpdateRequest = {
        name: values.name,
        schedule: base.schedule,
        formatType: values.formatType,
        domain: base.domain,
        authToken: base.authToken,
      };
      emit('save', { update });
    }
  } catch {
    // 校验未通过，由表单内联提示
  } finally {
    submitting.value = false;
  }
};

defineExpose({
  reset: () => {
    dirty.value = false;
  },
});
</script>

<template>
  <a-drawer
    :open="open"
    :title="mode === 'create' ? '新建通道' : '通道配置'"
    width="500"
    :mask-closable="false"
    @close="handleClose"
  >
    <a-alert
      style="margin-bottom: 16px"
      type="info"
      show-icon
      :message="
        mode === 'create' ? '新建 → 配置 → 启用；配置变更留审计（SB-08）' : '修改后保存即生效；配置变更留审计（SB-08）'
      "
      description="通道类型：API 推送 / 定时拉取；格式类型预留 dbt / profiler 扩展位（DQI-009，P1）。"
    />
    <YssFormily ref="formRef" :schema="schema" :initial-values="initialValues" @update:model-value="onValuesChange" />
    <template #footer>
      <a-space>
        <a-button type="primary" :loading="submitting" @click="handleSave">保存</a-button>
        <a-button @click="handleClose">取消</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>
