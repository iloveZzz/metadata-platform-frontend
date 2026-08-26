/**
 * 术语管理页 - 动作 Hook（新建 / 编辑 / 认证 / 弃用 / 删除）
 * 认证 / 弃用为高影响操作：前端防篡改二次确认（原型已确认）+ 审计回执；
 * 幂等语义（CT-09）由后端保证，前端提交后以返回结果提示并刷新。
 * 删除仅草稿且未被引用；被引用时后端 409 STATE_CONFLICT / REFERENCE_CONFLICT 阻断
 * （mutator 拦截器统一提示，提示改用弃用）。
 */
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { semanticTermsApi } from '@/api';
import type { CertifyRequestRequest, TermCreateRequest, TermUpdateRequest } from '@/api/generated/semantic/model';
import type { TermRow, TermCreateValues } from '../type';

export function useTermActions({ onSuccess }: { onSuccess: () => void }) {
  const creating = ref(false);
  const updating = ref(false);
  const certifying = ref(false);
  const deprecating = ref(false);
  const deleting = ref(false);

  /** 新建术语（保存为草稿；名称重复 422 TERM_NAME_DUPLICATE 由拦截器提示） */
  const create = async (values: TermCreateValues): Promise<boolean> => {
    if (creating.value) return false;
    creating.value = true;
    try {
      const payload: TermCreateRequest = {
        name: values.name,
        definition: values.definition,
        owner: values.owner,
        aliases: values.aliases ?? [],
        description: values.description || undefined,
      };
      await semanticTermsApi.PostSemanticTerms(payload);
      message.success(`已创建术语「${values.name}」，状态=草稿（SL-001）`);
      onSuccess();
      return true;
    } catch {
      return false;
    } finally {
      creating.value = false;
    }
  };

  /** 编辑术语（乐观锁 version 必填；已认证术语内容变更后认证失效退回草稿，SB-02） */
  const update = async (row: TermRow, values: TermCreateValues): Promise<boolean> => {
    if (updating.value) return false;
    updating.value = true;
    try {
      const payload: TermUpdateRequest = {
        name: values.name,
        definition: values.definition,
        owner: values.owner,
        version: row.version ?? 0,
        aliases: values.aliases ?? [],
        description: values.description || undefined,
      };
      await semanticTermsApi.PutSemanticTermsid(String(row.id), payload);
      message.success(`已保存「${values.name}」的修改（审计已记录）`);
      onSuccess();
      return true;
    } catch {
      return false;
    } finally {
      updating.value = false;
    }
  };

  /** 认证术语（POST /{id}/certify，action=certify；幂等；审计回执） */
  const certify = async (row: TermRow, note?: string): Promise<boolean> => {
    if (certifying.value) return false;
    certifying.value = true;
    try {
      const payload: CertifyRequestRequest = { action: 'certify', note: note || undefined };
      await semanticTermsApi.PostSemanticTermsidCertify(String(row.id), payload);
      message.success(`已认证术语「${row.name}」，审计记录已写入`);
      onSuccess();
      return true;
    } catch {
      return false;
    } finally {
      certifying.value = false;
    }
  };

  /** 弃用术语（action=deprecate；draft / certified → deprecated，幂等；SB-09 级联检查由弹窗完成） */
  const deprecate = async (row: TermRow, note?: string): Promise<boolean> => {
    if (deprecating.value) return false;
    deprecating.value = true;
    try {
      const payload: CertifyRequestRequest = { action: 'deprecate', note: note || undefined };
      await semanticTermsApi.PostSemanticTermsidCertify(String(row.id), payload);
      message.success(`已弃用术语「${row.name}」（历史可回溯，SL-001）`);
      onSuccess();
      return true;
    } catch {
      return false;
    } finally {
      deprecating.value = false;
    }
  };

  /** 删除术语（仅草稿且未被引用；物理删除，不可恢复；被引用 409 由后端阻断） */
  const remove = async (row: TermRow): Promise<boolean> => {
    if (deleting.value) return false;
    deleting.value = true;
    try {
      await semanticTermsApi.DeleteSemanticTermsid(String(row.id));
      message.success(`已删除草稿术语「${row.name}」`);
      onSuccess();
      return true;
    } catch {
      return false;
    } finally {
      deleting.value = false;
    }
  };

  return {
    creating,
    updating,
    certifying,
    deprecating,
    deleting,
    create,
    update,
    certify,
    deprecate,
    remove,
  };
}
