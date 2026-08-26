/**
 * 分级分类页 - 候选修正弹窗 Hook
 * 打开时以当前候选分类名预填；提交经 options.data 透传 correctedName
 * （冻结 spec 未声明 confirm requestBody，偏离登记：确认/修正合一）。
 */
import { ref } from 'vue';
import type { ClassificationItem } from '../type';

export function useCorrectModal({
  onSubmit,
}: {
  onSubmit: (row: ClassificationItem, correctedName: string) => Promise<boolean>;
}) {
  const visible = ref(false);
  const submitting = ref(false);
  const target = ref<ClassificationItem | null>(null);
  const correctedName = ref('');

  const open = (row: ClassificationItem) => {
    target.value = row;
    correctedName.value = row.name || '';
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
  };

  const handleSubmit = async () => {
    if (submitting.value || !target.value) return;
    const name = correctedName.value.trim();
    if (!name) return;
    submitting.value = true;
    try {
      const ok = await onSubmit(target.value, name);
      if (ok) visible.value = false;
    } finally {
      submitting.value = false;
    }
  };

  return { visible, submitting, target, correctedName, open, close, handleSubmit };
}
