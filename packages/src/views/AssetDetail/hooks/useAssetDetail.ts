/**
 * 资产详情页 - 详情 Hook
 * 详情聚合（元数据+字段+版本+标签+收藏状态）+ 收藏切换（幂等）+ 认领（409 定制提示）+
 * 标签覆盖式更新（Modal Select mode=tags）+ 归档-取消归档（只读状态机）。
 * 错误提示依赖 mutator.ts 拦截器；仅认领 409 定制文案使用 skipErrorHandler。
 * ID 一律字符串透传（json-bigint），不做 Number 转换。
 *
 * slice 06 seam：无 RBAC，治理专员角色门控（归档/认领/取消归档）暂按 owner/archived 状态驱动，
 * 角色接入后收敛为 isGov 门控（见合同 seam_deferred 与 WU-FE-04 注释）。
 */
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Modal } from 'ant-design-vue';
import {
  GetAssetsid,
  PostAssetsidArchive,
  PostAssetsidClaim,
  PostAssetsidFavorite,
  PostAssetsidUnarchive,
  PutAssetsidTags,
} from '@/api';
import { customMessage, handleErrorResponse } from '@/utils';
import type { AssetDetailItem, AssetItem } from '../../Asset/type';

export function useAssetDetail() {
  const route = useRoute();
  const router = useRouter();
  const loading = ref(false);
  const loadError = ref(false);
  const detail = ref<AssetDetailItem>({} as unknown as AssetDetailItem);
  const tagModalOpen = ref(false);
  const tagDraft = ref<string[]>([]);
  const savingTags = ref(false);

  /** 归档 / 已删除 -> 只读（状态矩阵：归档只读；取消归档恢复） */
  const readonly = computed(() => detail.value.status === 'archived' || detail.value.status === 'deleted');
  /** 取消归档仅对已归档（源端删除标记的 deleted 不可取消归档） */
  const isArchived = computed(() => detail.value.status === 'archived');

  /** 详情拉取（GET /api/assets/{id}，聚合元数据+字段+版本+标签+收藏状态） */
  const fetchDetail = async () => {
    const id = route.params.id as string | undefined;
    if (!id) return;
    loading.value = true;
    loadError.value = false;
    try {
      const res = await GetAssetsid(id);
      detail.value = (res?.data as unknown as AssetDetailItem) ?? {};
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  };

  /** 收藏 / 取消收藏（幂等切换；归档资产仍可收藏，见合同 frontend.deviations；失败由 mutator 拦截器统一提示） */
  const handleToggleFavorite = async () => {
    const id = detail.value.id;
    if (!id) return;
    try {
      const res = await PostAssetsidFavorite(id);
      const updated = (res?.data as unknown as AssetItem) ?? {};
      detail.value = { ...detail.value, favorite: updated.favorite };
      customMessage.success(updated.favorite ? `已收藏「${detail.value.name}」` : `已取消收藏「${detail.value.name}」`);
    } catch {
      // 拦截器已统一提示，此处不重复
    }
  };

  /** 认领 owner（已被他人认领返回 409，定制提示；成功刷新详情） */
  const handleClaim = async () => {
    const id = detail.value.id;
    if (!id || readonly.value) return;
    if (detail.value.owner) {
      customMessage.error('认领冲突（409）：该资产已被他人认领');
      return;
    }
    try {
      await PostAssetsidClaim(id, { skipErrorHandler: true });
      customMessage.success(`已认领「${detail.value.name}」`);
      await fetchDetail();
    } catch (error: any) {
      if (error?.response?.status === 409) {
        customMessage.error('认领冲突（409）：该资产已被他人认领');
      } else {
        await handleErrorResponse(error).catch(() => undefined);
      }
    }
  };

  /** 打开编辑标签 Modal（回填当前标签；覆盖式更新） */
  const openTagModal = () => {
    if (readonly.value) return;
    tagDraft.value = [...(detail.value.tags ?? [])];
    tagModalOpen.value = true;
  };

  const closeTagModal = () => {
    tagModalOpen.value = false;
  };

  /** 保存标签（PUT /tags 全量覆盖；归档资产 409 状态冲突由拦截器提示） */
  const handleSaveTags = async () => {
    const id = detail.value.id;
    if (!id || savingTags.value) return;
    savingTags.value = true;
    try {
      await PutAssetsidTags(id, { tags: tagDraft.value });
      customMessage.success('标签已更新');
      tagModalOpen.value = false;
      await fetchDetail();
    } catch {
      // 拦截器已提示
    } finally {
      savingTags.value = false;
    }
  };

  /** 归档（二次确认 danger；归档后只读；重复归档 409 由拦截器提示） */
  const handleArchive = () => {
    const id = detail.value.id;
    const name = detail.value.name;
    if (!id || readonly.value) return;
    Modal.confirm({
      title: '归档资产',
      content: `归档「${name}」后资产进入只读态，取消归档可恢复。是否继续？`,
      okText: '归档',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await PostAssetsidArchive(id);
          customMessage.success('已归档（只读）');
          await fetchDetail();
        } catch {
          // 拦截器已提示
        }
      },
    });
  };

  /** 取消归档（恢复可编辑；非归档状态幂等） */
  const handleUnarchive = async () => {
    const id = detail.value.id;
    if (!id || !isArchived.value) return;
    try {
      await PostAssetsidUnarchive(id);
      customMessage.success('已取消归档，资产恢复可编辑');
      await fetchDetail();
    } catch {
      // 拦截器已提示
    }
  };

  /** 复制表名至剪贴板 */
  const handleCopyTableName = async () => {
    const name = detail.value.name;
    if (!name) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(name);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = name;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      customMessage.success(`已复制表名「${name}」`);
    } catch {
      customMessage.info(`表名: ${name}`);
    }
  };

  /** 跳转至关联采集任务 */
  const goToCollector = () => {
    router.push('/collectors');
  };

  /** 跳转至关联数据源 */
  const goToConnector = () => {
    router.push('/connectors');
  };

  /** 返回上一级（若有历史记录则返回，否则返回资产目录） */
  const goBack = () => {
    if (window.history.state?.back) {
      router.back();
    } else {
      router.push('/assets');
    }
  };

  const goBackCatalog = goBack;

  watch(
    () => route.params.id as string | undefined,
    () => {
      fetchDetail();
    },
    { immediate: true }
  );

  return {
    loading,
    loadError,
    detail,
    readonly,
    isArchived,
    tagModalOpen,
    tagDraft,
    savingTags,
    fetchDetail,
    handleToggleFavorite,
    handleClaim,
    openTagModal,
    closeTagModal,
    handleSaveTags,
    handleArchive,
    handleUnarchive,
    handleCopyTableName,
    goToCollector,
    goToConnector,
    goBack,
    goBackCatalog,
  };
}
