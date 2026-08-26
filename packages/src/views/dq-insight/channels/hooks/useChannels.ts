import { ref } from 'vue';
import { useRequest } from 'vue-hooks-plus';
import {
  GetDqChannels,
  PostDqChannels,
  PutDqChannelsid,
  PostDqChannelsidRetry,
  type Channel,
  type ChannelCreateRequest,
  type ChannelUpdateRequest,
} from '@/api';
import { customMessage } from '@/utils/message';
import { isForbiddenError } from '@/views/dq-insight/types';
import type { DqCapability, ReturnPermission } from '@/views/dq-insight/hooks/usePermission';

/**
 * 通道管理数据 Hook（04-WU5）。
 *
 * 列表：GET /api/dq/channels（MultiResult data = Channel[]，无服务端分页，前端本地分页）。
 * 操作：新建（POST，重名 409 err.dq.channel.name-conflict）/ 更新（PUT，启停与配置共用）/ 重试（POST retry，拉取中锁定幂等）。
 * 状态覆盖（状态矩阵 §3 通道管理）：loading / 空（无通道 → 新建主操作）/ 错误（可重试）/ 403（能力被拒后禁用）/ 幂等冲突（重试中禁重复触发）。
 */

export interface UseChannelsOptions {
  /** 权限体验 hook（403 兜底禁用） */
  permission: ReturnPermission;
}

export function useChannels({ permission }: UseChannelsOptions) {
  const channels = ref<Channel[]>([]);
  const isForbidden = ref(false);
  const hasError = ref(false);
  /** 重试中的通道 id（拉取中操作锁定，幂等防重复触发，状态矩阵 §3 幂等冲突） */
  const retryingId = ref<string | null>(null);

  const { loading, run: runList } = useRequest(() => GetDqChannels(), {
    manual: true,
    onSuccess: res => {
      const data = (res?.data ?? []) as Channel[];
      channels.value = Array.isArray(data) ? data : [];
      isForbidden.value = false;
      hasError.value = false;
    },
    onError: e => {
      isForbidden.value = isForbiddenError(e);
      hasError.value = !isForbidden.value;
      channels.value = [];
    },
  });

  const load = () => {
    runList();
  };

  /** 新建通道（drawer 保存） */
  const createChannel = async (payload: ChannelCreateRequest): Promise<boolean> => {
    try {
      await PostDqChannels(payload);
      customMessage.success(`通道「${payload.name}」已创建（配置变更已审计）`);
      await load();
      return true;
    } catch (e) {
      permission.recordDenied('channel-create', e);
      return false;
    }
  };

  /** 更新通道（配置 / 启停共用） */
  const updateChannel = async (id: string, payload: ChannelUpdateRequest): Promise<boolean> => {
    try {
      await PutDqChannelsid(id, payload);
      customMessage.success('通道配置已更新（配置变更已审计）');
      await load();
      return true;
    } catch (e) {
      permission.recordDenied('channel-update', e);
      return false;
    }
  };

  /** 启停切换（不可逆操作二次确认在页面层，状态矩阵 §3 / 交互反馈基线） */
  const toggleChannel = async (ch: Channel): Promise<boolean> => {
    const enabled = ch.state !== 'enabled';
    return updateChannel(ch.id!, { enabled });
  };

  /** 重试拉取（拉取中禁用重试按钮，幂等防重复触发） */
  const retryChannel = async (ch: Channel): Promise<boolean> => {
    if (retryingId.value) {
      customMessage.warning('另一通道正在拉取中，接口幂等拒绝重复触发（409）');
      return false;
    }
    retryingId.value = ch.id!;
    try {
      await PostDqChannelsidRetry(ch.id!);
      customMessage.success(`「${ch.name}」重试成功，新批次已入库（已审计）`);
      await load();
      return true;
    } catch (e) {
      permission.recordDenied('channel-retry', e);
      customMessage.error(`「${ch.name}」重试失败，请查看错误信息`);
      return false;
    } finally {
      retryingId.value = null;
    }
  };

  return {
    channels,
    loading,
    isForbidden,
    hasError,
    retryingId,
    load,
    createChannel,
    updateChannel,
    toggleChannel,
    retryChannel,
  };
}

export type UseChannelsReturn = ReturnType<typeof useChannels>;
export type { DqCapability };
