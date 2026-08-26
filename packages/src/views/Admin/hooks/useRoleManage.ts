/**
 * 系统管理页 - 角色管理 Hook
 * GET/POST /api/roles + DELETE /api/roles/{id}（409 role.in_use 定制提示）。
 * 错误提示依赖 mutator.ts 拦截器；409 引用冲突为定制文案场景使用 skipErrorHandler。
 */
import { onMounted, ref, type Ref } from 'vue';
import { GetRoles, PostRoles, DeleteRolesid } from '@/api';
import { customMessage, handleErrorResponse } from '@/utils';
import type { RoleFormValues, RoleItem, YssFormilyExpose } from '../type';

export function useRoleManage({
  formRef,
  enabled,
}: {
  formRef: Ref<YssFormilyExpose | undefined>;
  enabled?: () => boolean;
}) {
  const loading = ref(false);
  const loadError = ref(false);
  const dataList = ref<RoleItem[]>([]);
  const visible = ref(false);
  const submitting = ref(false);

  const canFetch = () => (enabled ? enabled() : true);

  const fetchList = async () => {
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetRoles();
      dataList.value = (res?.data ?? []) as RoleItem[];
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  const openCreate = () => {
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const handleCreate = async () => {
    if (submitting.value) return;
    try {
      await formRef.value?.submit();
    } catch {
      return;
    }
    const values = (formRef.value?.getValues() ?? {}) as RoleFormValues;
    // 防御性判断：submit() 已对 name required 校验，此处兜底（校验失败提前 return）
    if (!values.name) return;
    submitting.value = true;
    try {
      // 冻结 API 未声明 requestBody，经 options 透传 body（CustomRequestConfig.data）
      await PostRoles({
        data: {
          name: values.name,
          scope: values.scope || undefined,
          domains: values.domains || [],
        },
      });
      customMessage.success(`角色「${values.name}」已创建`);
      visible.value = false;
      await fetchList();
    } catch {
      // 拦截器已统一提示（409 名称冲突 / 403 / 业务错误），此处不重复
    } finally {
      submitting.value = false;
    }
  };

  const handleDelete = async (row: RoleItem) => {
    try {
      await DeleteRolesid(row.id, { skipErrorHandler: true });
      customMessage.success(`角色「${row.name}」已删除`);
      await fetchList();
    } catch (error: any) {
      const errCode = (error?.response?.data?.code as string) ?? '';
      if (error?.response?.status === 409 || errCode === 'role.in_use') {
        customMessage.error(`角色「${row.name}」仍被 ${row.refs ?? ''} 个数据域绑定引用，无法删除`);
      } else {
        await handleErrorResponse(error).catch(() => undefined);
      }
    }
  };

  onMounted(() => {
    // 非管理员不发起管理端请求（避免 403 toast 噪音；页面级 PermissionDenied 兜底）
    if (canFetch()) {
      fetchList();
    }
  });

  return {
    loading,
    loadError,
    dataList,
    visible,
    submitting,
    fetchList,
    openCreate,
    close,
    handleCreate,
    handleDelete,
  };
}
