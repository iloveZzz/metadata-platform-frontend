import { ref, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { SecurityGradeVO } from '@/api/generated/data-security/schemas';

export function useSecurityGradeTable() {
  const api = getDataSecurityCenterAPIAPIApi();
  const loading = ref(false);
  const tableData = ref<SecurityGradeVO[]>([]);
  const searchKeyword = ref('');

  const filteredData = computed(() => {
    const kw = searchKeyword.value.trim().toLowerCase();
    if (!kw) {
      return tableData.value;
    }
    return tableData.value.filter(
      item =>
        (item.gradeName && item.gradeName.toLowerCase().includes(kw)) ||
        (item.gradeCode && item.gradeCode.toLowerCase().includes(kw)) ||
        (item.description && item.description.toLowerCase().includes(kw))
    );
  });

  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await api.listSecurityGrades();
      tableData.value = res.data || [];
    } catch (err: any) {
      message.error(err.message || '加载数据分级失败');
    } finally {
      loading.value = false;
    }
  };

  const handleDelete = async (row: SecurityGradeVO) => {
    try {
      await api.deleteSecurityGrade(row.id!);
      message.success(`数据分级 [${row.gradeName || row.gradeCode}] 已成功删除`);
      fetchList();
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.code === 'GRADE_REFERENCE_CONFLICT' || err.response?.status === 409) {
        Modal.error({
          title: '数据分级删除拦截',
          content:
            errorData?.message ||
            `数据分级 [${row.gradeName || row.gradeCode}] 已被识别规则或资产分类引用，不支持删除！`,
          okText: '知道了',
        });
      } else {
        message.error(errorData?.message || err.message || '删除数据分级失败');
      }
    }
  };

  onMounted(() => {
    fetchList();
  });

  return {
    loading,
    tableData,
    searchKeyword,
    filteredData,
    fetchList,
    handleDelete,
  };
}
