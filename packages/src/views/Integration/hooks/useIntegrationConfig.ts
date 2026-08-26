/**
 * 集成配置页 - 业务逻辑 Hook
 * GET/PUT /api/integrations（合并保存：单例行 upsert，保存任一侧都需带全量字段避免覆盖另一侧）
 * + POST /api/exports/datahub（202 幂等）+ 审计。错误提示依赖 mutator.ts 拦截器，不重复 message.error。
 */
import { onActivated, onMounted, ref, type Ref } from 'vue';
import { GetIntegrations, PutIntegrations, PostExportsDatahub } from '@/api';
import { customMessage } from '@/utils';
import type { ExportTaskData, IntegrationConfigData, YssFormilyExpose } from '../type';

export function useIntegrationConfig({
  gravitinoFormRef,
  datahubFormRef,
}: {
  gravitinoFormRef: Ref<YssFormilyExpose | undefined>;
  datahubFormRef: Ref<YssFormilyExpose | undefined>;
}) {
  const loading = ref(false);
  const loadError = ref(false);
  /** 表单重建 key：配置刷新后重新挂载表单以回填 initial-values */
  const formReloadKey = ref(0);
  const testing = ref(false);
  const saving = ref(false);
  const exporting = ref(false);
  const config = ref<IntegrationConfigData>({});
  const lastExportTask = ref<ExportTaskData | null>(null);

  const applyConfig = (data: unknown) => {
    config.value = (data ?? {}) as IntegrationConfigData;
    formReloadKey.value += 1;
  };

  /** 拉取集成配置（0 配置返回空结构，空态非错误） */
  const fetchConfig = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetIntegrations();
      applyConfig(res?.data);
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 校验并取表单值；表单未挂载（加载中）或校验失败返回 null */
  const collectForm = async (formRef: Ref<YssFormilyExpose | undefined>) => {
    if (!formRef.value) return null;
    try {
      await formRef.value?.submit();
    } catch {
      return null;
    }
    return (formRef.value?.getValues() ?? {}) as Record<string, any>;
  };

  /** 保存 Gravitino 配置（test=true 时先测试连接，失败 422 由拦截器提示且不保存） */
  const saveGravitino = async (test: boolean) => {
    if (saving.value || testing.value) return;
    const values = await collectForm(gravitinoFormRef);
    if (!values) return;
    if (test) {
      testing.value = true;
    } else {
      saving.value = true;
    }
    try {
      const res = await PutIntegrations({
        data: {
          gravitinoEndpoint: values.endpoint || undefined,
          gravitinoAuthToken: values.authToken || undefined,
          gravitinoEnabled: Boolean(values.enabled),
          datahubEndpoint: config.value.datahub?.endpoint || undefined,
          test: test || undefined,
        },
      });
      applyConfig(res?.data);
      customMessage.success(test ? 'Gravitino 连接测试通过，配置已保存' : 'Gravitino 配置已保存');
    } catch {
      // 拦截器已统一提示（422 连接测试失败 / 业务错误），此处不重复
    } finally {
      testing.value = false;
      saving.value = false;
    }
  };

  /** 保存 DataHub 配置（合并保留 Gravitino 侧字段） */
  const saveDatahub = async () => {
    if (saving.value) return;
    const values = await collectForm(datahubFormRef);
    if (!values) return;
    saving.value = true;
    try {
      const res = await PutIntegrations({
        data: {
          gravitinoEndpoint: config.value.gravitino?.endpoint || undefined,
          gravitinoEnabled: Boolean(config.value.gravitino?.enabled),
          datahubEndpoint: values.endpoint || undefined,
          datahubAuthToken: values.authToken || undefined,
        },
      });
      applyConfig(res?.data);
      customMessage.success('DataHub 配置已保存');
    } catch {
      // 拦截器已统一提示
    } finally {
      saving.value = false;
    }
  };

  /** 触发 DataHub 导出（202 幂等；目标未配置 422 由拦截器提示） */
  const triggerExport = async () => {
    if (exporting.value) return;
    exporting.value = true;
    try {
      const res = await PostExportsDatahub();
      const task = (res?.data ?? null) as ExportTaskData | null;
      lastExportTask.value = task;
      const status = task?.status ?? '';
      const message =
        status === 'success'
          ? 'DataHub 导出任务已完成（异步幂等，已审计）'
          : status === 'failed'
            ? 'DataHub 导出任务失败，详见任务状态'
            : 'DataHub 导出任务已提交，执行中（202 幂等，已审计）';
      customMessage.success(message);
    } catch {
      // 拦截器已统一提示
    } finally {
      exporting.value = false;
    }
  };

  onMounted(() => {
    fetchConfig();
  });

  // keep-alive 页面切回时刷新配置与任务状态（避免停留上次进入的快照）
  onActivated(() => {
    fetchConfig();
  });

  return {
    loading,
    loadError,
    formReloadKey,
    testing,
    saving,
    exporting,
    config,
    lastExportTask,
    fetchConfig,
    saveGravitino,
    saveDatahub,
    triggerExport,
  };
}
