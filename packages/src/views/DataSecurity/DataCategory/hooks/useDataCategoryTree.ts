import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getDataSecurityCenterAPIAPIApi } from '@/api/generated/data-security';
import type { CategoryTreeNodeVO } from '@/api/generated/data-security/schemas';

export function useDataCategoryTree() {
  const api = getDataSecurityCenterAPIAPIApi();
  const treeLoading = ref(false);
  const treeData = ref<CategoryTreeNodeVO[]>([]);
  const selectedKey = ref<number | string | null>(null);
  const selectedNode = ref<CategoryTreeNodeVO | null>(null);

  const findNodeById = (nodes: CategoryTreeNodeVO[], id: number | string): CategoryTreeNodeVO | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const fetchTree = async () => {
    treeLoading.value = true;
    try {
      const res = await api.getCategoryTree();
      treeData.value = res.data || [];
      if (selectedKey.value && selectedKey.value !== 0 && selectedKey.value !== 'all') {
        selectedNode.value = findNodeById(treeData.value, selectedKey.value);
      }
    } catch (err: any) {
      message.error(err?.message || '加载分类目录树失败');
    } finally {
      treeLoading.value = false;
    }
  };

  const handleSelect = (keys: any[], info: any) => {
    if (keys.length > 0) {
      selectedKey.value = keys[0];
      selectedNode.value = info.node;
    } else {
      selectedKey.value = 0;
      selectedNode.value = null;
    }
  };

  const createNode = async (data: {
    parentId?: any;
    nodeName: string;
    visibility?: any;
    description?: string;
    admins?: string[];
  }) => {
    try {
      await api.createCategoryTreeNode(data as any);
      message.success('分类目录节点创建成功');
      await fetchTree();
    } catch (err: any) {
      message.error(err?.message || '创建分类目录节点失败');
    }
  };

  const updateNode = async (
    id: any,
    data: { nodeName: string; visibility?: any; description?: string; admins?: string[] }
  ) => {
    try {
      await api.updateCategoryTreeNode(id, data as any);
      message.success('分类目录节点更新成功');
      await fetchTree();
    } catch (err: any) {
      message.error(err?.message || '更新分类目录节点失败');
    }
  };

  const deleteNode = async (id: any) => {
    try {
      await api.deleteCategoryTreeNode(id);
      message.success('分类目录节点已删除');
      if (selectedKey.value === id) {
        selectedKey.value = null;
        selectedNode.value = null;
      }
      await fetchTree();
    } catch (err: any) {
      message.error(err?.message || '删除分类目录节点失败');
    }
  };

  onMounted(() => {
    fetchTree();
  });

  return {
    treeLoading,
    treeData,
    selectedKey,
    selectedNode,
    fetchTree,
    handleSelect,
    createNode,
    updateNode,
    deleteNode,
  };
}
