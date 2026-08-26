<template>
  <div class="tag-taxonomy-view p-6 bg-slate-50 min-h-screen">
    <div
      class="header mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
    >
      <div>
        <h1 class="text-xl font-bold text-slate-900">标签体系与三层打标规则配置中心</h1>
        <p class="text-xs text-slate-500 mt-1">
          维护企业多级标签目录，为每个标签配置 L1 正则预过滤、L2 术语词库绑定与 L3 Few-Shot 提示词模版
        </p>
      </div>
      <button
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        @click="handleCreateTag"
      >
        + 新建标签定义
      </button>
    </div>

    <div class="grid grid-cols-12 gap-6 items-start">
      <!-- 标签目录树 -->
      <div class="col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div class="text-xs font-bold text-slate-500 uppercase border-b pb-2">
          标签分类目录 (共 {{ tags.length }} 项)
        </div>
        <div v-if="loadingTags" class="py-8 text-center text-slate-400 text-xs">加载标签目录中...</div>
        <div v-else-if="tags.length === 0" class="py-8 text-center text-slate-400 text-xs">
          暂无标签，请点击右上角新建
        </div>
        <div
          v-for="tag in tags"
          :key="tag.id"
          :class="
            selectedTag && selectedTag.id === tag.id
              ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
              : 'hover:bg-slate-50 border-transparent text-slate-700'
          "
          class="p-3 rounded-lg border cursor-pointer flex justify-between items-center transition"
          @click="handleSelectTag(tag)"
        >
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span class="text-xs">{{ tag.name }}</span>
          </div>
          <span class="text-[10px] font-mono text-slate-400">{{ tag.code }}</span>
        </div>
      </div>

      <!-- 三层规则配置面板 -->
      <div class="col-span-8 space-y-6">
        <div v-if="selectedTag" class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex justify-between items-center border-b pb-3">
            <h2 class="text-base font-bold text-slate-800">配置「{{ selectedTag.name }}」三层规则</h2>
            <button
              :disabled="savingRules"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50"
              @click="saveRules"
            >
              {{ savingRules ? '保存中...' : '保存规则' }}
            </button>
          </div>

          <!-- L1 正则 -->
          <div class="p-3.5 bg-slate-50 border rounded-lg space-y-1.5">
            <div class="flex justify-between text-xs font-bold text-purple-900">
              <span>Layer 1 启发式正则预过滤 (Regex Pre-filter)</span>
              <span class="text-slate-400 font-normal">置信度 = 95%~100%</span>
            </div>
            <input
              v-model="selectedTagRule.regexPattern"
              placeholder="输入正则表达式，如 ^(cust_id|id_card)"
              class="w-full text-xs font-mono p-2 border rounded bg-white"
            />
          </div>

          <!-- L2 词库绑定 -->
          <div class="p-3.5 bg-slate-50 border rounded-lg space-y-1.5">
            <div class="flex justify-between text-xs font-bold text-blue-900">
              <span>Layer 2 中文业务术语绑定 (Glossary Binding)</span>
              <span class="text-slate-400 font-normal">置信度 = 85%~92%</span>
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <span
                v-for="(term, idx) in selectedTagRule.boundTermNames || []"
                :key="idx"
                class="px-2 py-0.5 bg-white border border-blue-200 text-blue-800 text-xs rounded"
              >
                {{ term }}
              </span>
              <button
                class="px-2 py-0.5 border border-dashed border-blue-400 text-blue-600 text-xs rounded hover:bg-blue-50"
                @click="addTerm"
              >
                + 绑定术语
              </button>
            </div>
          </div>

          <!-- L3 Few-Shot 模版 -->
          <div class="p-3.5 bg-slate-50 border rounded-lg space-y-1.5">
            <div class="text-xs font-bold text-indigo-900">Layer 3 大模型 Few-Shot 推导模版</div>
            <textarea
              v-model="selectedTagRule.fewShotPrompt"
              rows="2"
              placeholder="描述判断依据与正反例..."
              class="w-full text-xs p-2 border rounded bg-white"
            ></textarea>
          </div>
        </div>
        <div v-else class="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200 text-xs">
          请从左侧选择一个标签以配置三层规则
        </div>

        <!-- 在线测试沙箱 -->
        <div class="bg-slate-900 text-white p-4 rounded-xl space-y-3 shadow-md">
          <div class="flex justify-between text-xs font-bold">
            <span class="text-amber-400">⚡ 在线三层漏斗规则测试沙箱</span>
            <span class="text-slate-400 font-normal">输入样例字段检验命中逻辑</span>
          </div>
          <div class="grid grid-cols-12 gap-2">
            <input
              v-model="sandboxField"
              placeholder="字段名 (如 cust_id_card)"
              class="col-span-5 bg-slate-800 border border-slate-700 text-xs px-2.5 py-1.5 rounded text-white"
            />
            <input
              v-model="sandboxComment"
              placeholder="注释 (如 客户身份证号码)"
              class="col-span-5 bg-slate-800 border border-slate-700 text-xs px-2.5 py-1.5 rounded text-white"
            />
            <button
              :disabled="testingSandbox"
              class="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded text-white disabled:opacity-50"
              @click="testSandbox"
            >
              {{ testingSandbox ? '测试中...' : '测试命中' }}
            </button>
          </div>
          <div v-if="sandboxResult" class="p-2.5 bg-slate-800 rounded border border-slate-700 text-xs space-y-1">
            <div class="text-emerald-400 font-bold">
              🎯 推荐命中：{{ sandboxResult.matchedTagName || '未命中' }} ({{
                ((sandboxResult.confidence || 0) * 100).toFixed(0)
              }}%)
            </div>
            <div class="text-slate-300 text-[11px]">{{ sandboxResult.explanation || '—' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  listTags,
  createTag,
  getTagRules,
  updateTagRules,
  testSandboxRule,
  type TagDTO,
  type TagRuleDTO,
  type SandboxResultDTO,
} from '@/api/smartDiscoveryApi';

const loadingTags = ref(false);
const savingRules = ref(false);
const testingSandbox = ref(false);

const tags = ref<TagDTO[]>([]);
const selectedTag = ref<TagDTO | null>(null);
const selectedTagRule = ref<TagRuleDTO>({
  tagId: '',
  regexPattern: '',
  boundTermNames: [],
  fewShotPrompt: '',
});

const sandboxField = ref('cust_id_card');
const sandboxComment = ref('身份证号');
const sandboxResult = ref<SandboxResultDTO | null>(null);

const fetchTags = async () => {
  loadingTags.value = true;
  try {
    const res = await listTags();
    tags.value = res?.data || [];
    if (tags.value.length > 0) {
      if (!selectedTag.value || !tags.value.some(t => t.id === selectedTag.value?.id)) {
        await handleSelectTag(tags.value[0]);
      }
    } else {
      selectedTag.value = null;
    }
  } catch (e) {
    message.error('加载标签列表失败');
  } finally {
    loadingTags.value = false;
  }
};

const handleSelectTag = async (tag: TagDTO) => {
  selectedTag.value = tag;
  try {
    const res = await getTagRules(tag.id);
    if (res?.data) {
      selectedTagRule.value = res.data;
    } else {
      selectedTagRule.value = {
        tagId: tag.id,
        regexPattern: '',
        boundTermNames: [],
        fewShotPrompt: '',
      };
    }
  } catch (e) {
    selectedTagRule.value = {
      tagId: tag.id,
      regexPattern: '',
      boundTermNames: [],
      fewShotPrompt: '',
    };
  }
};

const handleCreateTag = async () => {
  const name = prompt('请输入新标签中文名称:');
  if (!name || !name.trim()) return;
  const code = prompt('请输入新标签唯一编码 (如 BIZ_FINANCE_ORDER):');
  if (!code || !code.trim()) return;

  try {
    await createTag({
      name: name.trim(),
      code: code.trim(),
      categoryCode: 'DOMAIN',
    });
    message.success(`标签「${name}」已创建`);
    await fetchTags();
  } catch (e) {
    message.error('创建标签失败');
  }
};

const saveRules = async () => {
  if (!selectedTag.value) return;
  savingRules.value = true;
  try {
    await updateTagRules(selectedTag.value.id, {
      tagId: selectedTag.value.id,
      regexPattern: selectedTagRule.value.regexPattern,
      boundTermNames: selectedTagRule.value.boundTermNames,
      fewShotPrompt: selectedTagRule.value.fewShotPrompt,
    });
    message.success('三层规则配置已成功保存！');
  } catch (e) {
    message.error('保存规则失败');
  } finally {
    savingRules.value = false;
  }
};

const addTerm = () => {
  const term = prompt('输入要绑定的术语名称:');
  if (term && term.trim()) {
    if (!selectedTagRule.value.boundTermNames) {
      selectedTagRule.value.boundTermNames = [];
    }
    selectedTagRule.value.boundTermNames.push(term.trim());
  }
};

const testSandbox = async () => {
  if (!sandboxField.value.trim()) {
    message.warning('请输入测试字段名');
    return;
  }
  testingSandbox.value = true;
  try {
    const res = await testSandboxRule(sandboxField.value.trim(), sandboxComment.value.trim());
    if (res?.data) {
      sandboxResult.value = res.data;
    }
  } catch (e) {
    message.error('沙箱测试失败');
  } finally {
    testingSandbox.value = false;
  }
};

onMounted(() => {
  fetchTags();
});
</script>
