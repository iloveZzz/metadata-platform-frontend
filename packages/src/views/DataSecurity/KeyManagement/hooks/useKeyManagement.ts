import { ref, reactive, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';

export interface KeyManagementItem {
  id: number;
  keyName: string;
  keyType: string; // HASH / ENCRYPTION
  algorithm?: string;
  keyLength?: number;
  genType?: string; // SYSTEM / CUSTOM
  ownerOnly?: boolean;
  publicKeyValue?: string;
  description?: string;
  owner?: string;
  status?: string;
  referencedRulesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function useKeyManagement() {
  const api = getDataSecurityCenterAPIAPIApi();
  const loading = ref(false);
  const tableData = ref<KeyManagementItem[]>([]);

  const searchParams = reactive({
    pageIndex: 1,
    pageSize: 10,
    keyword: '',
    isMine: false,
    keyType: undefined as string | undefined,
    algorithm: undefined as string | undefined,
    genType: undefined as string | undefined,
    owner: undefined as string | undefined,
  });

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条密钥`,
  });

  const fetchList = async () => {
    loading.value = true;
    try {
      const res = await (api as any).pageKeys({
        pageIndex: searchParams.pageIndex,
        pageSize: searchParams.pageSize,
        keyword: searchParams.keyword || undefined,
        isMine: searchParams.isMine ? true : undefined,
        keyType: searchParams.keyType || undefined,
        algorithm: searchParams.algorithm || undefined,
        genType: searchParams.genType || undefined,
        owner: searchParams.owner || undefined,
      });
      tableData.value = (res as any)?.data || [];
      pagination.total = (res as any)?.totalCount || (res as any)?.total || 0;
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || '加载密钥列表失败');
    } finally {
      loading.value = false;
    }
  };

  const onSearch = () => {
    searchParams.pageIndex = 1;
    pagination.current = 1;
    fetchList();
  };

  const onReset = () => {
    searchParams.keyword = '';
    searchParams.isMine = false;
    searchParams.keyType = undefined;
    searchParams.algorithm = undefined;
    searchParams.genType = undefined;
    searchParams.owner = undefined;
    searchParams.pageIndex = 1;
    pagination.current = 1;
    fetchList();
  };

  const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    searchParams.pageIndex = current;
    searchParams.pageSize = pageSize;
    pagination.current = current;
    pagination.pageSize = pageSize;
    fetchList();
  };

  const handleDelete = async (row: KeyManagementItem) => {
    try {
      await api.deleteKey(row.id);
      message.success(`密钥 [${row.keyName}] 已成功删除`);
      fetchList();
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.code === 'KEY_IN_USE') {
        Modal.error({
          title: '密钥删除强拦截 (409 Conflict)',
          content:
            errData.message || `密钥 [${row.keyName}] 当前正被任务或脱敏规则引用，删除可能导致现有任务出错，禁止删除！`,
        });
      } else {
        message.error(errData?.message || err.message || '删除密钥失败');
      }
    }
  };

  onMounted(() => {
    fetchList();
  });

  return {
    loading,
    tableData,
    searchParams,
    pagination,
    fetchList,
    onSearch,
    onReset,
    handlePageChange,
    handleDelete,
  };
}
