---
name: API Integration
description: 指导在 Vue3 业务模块中集成 Orval API，确保类型安全、错误处理和加载状态一致；规范 json-bigint 大数字字段处理，并将 Excel、CSV、PDF、Blob、报表、模板等文件导出下载任务路由到 file-export-download。
---

# API Integration Skill

## 触发条件

- 页面需要接后端接口（列表查询、创建、编辑、删除、详情）。
- 需要使用 Orval 生成客户端并保持类型安全。
- 需要统一加载、错误提示和请求参数转换。
- 页面涉及导出、下载或 Blob 文件流时，同时读取 `../file-export-download/SKILL.md`。

## 不适用场景

- 仅讨论页面骨架，不涉及真实接口对接。
- 仅做 Formily schema 改动，不涉及接口层。
- 后端契约尚未确定，无法稳定落类型。

## 硬约束（禁止/必须）

- 必须优先使用 Orval 生成接口和类型，禁止手写重复 DTO 类型。
- **必须按需具名导入 API 函数**，禁止在 hook 内调用 `getApi()` 再解构（避免无意义的工厂对象组装）。
- 必须在 hook 层封装请求，不在模板和 schema 表达式里直接请求 API。
- 列表接口必须处理分页字段映射（如 `totalCount`、`pageIndex`）。
- 列表接口只产出 `dataList/loading/pagination/fetchData/handlePageChange` 等状态和方法；不要假设组件支持 `request/search-params/refresh`。
- **响应与错误处理**：底层 `mutator.ts` 响应拦截器已统一对网络错误及 `success === false` 的业务错误处理了 `message.error` 提示并抛出 `Promise.reject` 中断执行。Hook 内：
  - ❌ 禁止在 `else` 或 `catch` 中重复写 `message.error`；
  - ❌ 禁止对 `await` 的结果使用 `if (res?.success)` 冗余嵌套（`await` 解析成功则保证 `success` 为 true）；
  - ✅ 直接使用 `res?.data ?? []` 或 `res?.data ?? {}` 做缺省数据赋值，异步操作成功后直接触发成功 Toast 和刷新逻辑。
- 错误提示必须统一，避免每个调用点随机文案。
- 请求参数必须显式转换（时间、枚举、空值）后再发起。
- **凡是涉及 number 类型的字段，一律禁止做任何数字转换**：不允许 `Number()`、`parseInt`、`parseFloat`、`+x`、`* 1`、`~~x` 等任何方式把它转成 JS number。底层 `mutator.ts` 用 `json-bigint({ storeAsString: true })` 解析响应，数字已被安全地保留为原始字符串以保精度，任何转换都可能触发 JS 双精度丢精度（超过 `2^53`）。回传、比较、展示时**一律直接透传原始字符串**。
- 文件导出下载必须遵循 `file-export-download`：优先使用 `handleBlobResponse(res.data, res.headers)`；生成方法缺少 Blob 配置时，调用第二参数必须传 `{ responseType: 'blob' }`。

## 大数字与精度（json-bigint）

### 背景

`packages/src/api/mutator.ts` 用 `JSONbig({ storeAsString: true })` 全局接管 axios 的 `transformResponse`。后端返回的所有数字（雪花 ID、长整型主键、金额、数量、各种 `number` 字段）都会被解析为 **字符串**，从而避免超出 `Number.MAX_SAFE_INTEGER`（`2^53 - 1`）时的精度丢失。一旦再用 `Number()` 等方式转回数字，精度就被破坏（例如 `Number('1234567890123456789')` → `1234567890123456800`）。

### 核心原则

**只要是接口返回的 `number` 类型字段，就当作不可变的字符串原样使用——不要转、不要算、不要猜“这个一定很小不会溢出”。** 是否溢出由运行时数据决定，不能靠字段语义判断，所以统一禁止任何转换才安全。

### 禁止写法

```typescript
// ❌ 任何形式的数字转换都禁止
await getSpvProductInfoDetail({ id: Number(row.id) });
await qualityRuleEnabled({ id: parseInt(row.id), status: newStatus });
const amount = +row.amount; // ❌ 一元加号
const qty = row.quantity * 1; // ❌ 乘 1
const idNum = ~~row.id; // ❌ 位运算取整
if (Number(a.id) === Number(b.id)) {
} // ❌ 比较前转 number
```

### 推荐写法

```typescript
// ✅ 直接透传 / 直接用字符串比较，保持 json-bigint 解析出的原始值
await getSpvProductInfoDetail({ id: row.id });
await qualityRuleEnabled({ id: row.id, status: newStatus });
if (a.id === b.id) {
} // 字符串相等比较
const amount = row.amount; // 展示直接用字符串
```

> Orval 生成的类型可能把字段标成 `number`，但运行时是 `string`。**如遇类型不匹配，用类型断言（`row.id as unknown as number`）兜底，绝不要用 `Number()` 等方式转换**。确需数值计算（求和、汇率等）时，使用 `decimal.js`/`big.js` 等以字符串入参的高精度库，禁止先转成原生 `number` 再算。

## API 生成与调用约定

### 生成链路

```bash
pnpm generate:api
# orval → api-schema-cleanup → api-flatten-exports → prettier
```

Orval 默认 `single + axios` 会生成 `getApi()` 工厂；`scripts/api-flatten-exports.cjs` 会在生成后把每个接口提升为**模块级具名导出**，`getApi()` 仅保留为兼容别名（返回已有函数引用，不再重复创建闭包）。

### 推荐写法（业务 hook）

```typescript
import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';
import { pageQaDataSrcManagers, addQaDataSrcManager } from '@/api';
import type { QaDataSrcManagerPage } from '@/api/generated/quality/schemas';

export function useAgingManageList() {
  const loading = ref(false);
  const dataList = ref([]);
  const query = reactive<QaDataSrcManagerPage>({ pageIndex: 1, pageSize: 20 });

  const fetchData = async () => {
    loading.value = true;
    try {
      const res = await pageQaDataSrcManagers(query);
      dataList.value = res.data?.list || [];
    } catch {
      message.error('数据加载失败');
    } finally {
      loading.value = false;
    }
  };

  return { loading, dataList, query, fetchData };
}
```

### 禁止写法

```typescript
// ❌ 每次 hook 初始化都会 getApi()，历史实现会重复创建大量闭包
import { getApi } from '@/api';

export function useXxx() {
  const api = getApi();
  await api.pageQaDataSrcManagers(query);
}
```

### 类型导入

- 请求/响应 DTO：从 `@/api/generated/quality/schemas` 按需导入。
- 单接口响应类型：优先 `Awaited<ReturnType<typeof pageQaDataSrcManagers>>`，或使用生成文件末尾的 `XxxApiResult`（与 schema 重名时已自动加 `ApiResult` 后缀）。

### 兼容说明

- `getApi()` 仍可从 `@/api` 导出，仅用于渐进迁移或动态代理场景；新代码不要依赖它。

## 自定义请求配置（Second Parameter Options）

### 背景与配置

Orval 已全局配置 `options: true`，生成的每一个 API 函数（如 `createUser(data, options)`、`pageUsers(query, options)`）均支持第二个可选参数 `options`。该参数会透传给 `customInstance` 并与 Axios 配置进行合并。

### 支持的扩展属性 (`CustomRequestConfig`)

- `skipBusinessError?: boolean`：跳过业务错误（`success === false`）的全局 `message.error` 弹窗，交由业务代码 `catch` 自定义处理。
- `skipErrorHandler?: boolean`：跳过所有错误（含 HTTP 网络异常/4xx/5xx）的全局弹窗。
- 原生 Axios 配置透传：
- `responseType: 'blob'`：用于生成方法未包含 Blob 配置时的导出/二进制文件流兜底；完整流程读取 `../file-export-download/SKILL.md`。
  - `headers: { ... }`：传递特定请求头（如 `x-trace-id`、`x-client-version`）。
  - `timeout: number`：单独覆盖特定长耗时接口的超时限制（如大文件导出设为 120000ms）。
  - `signal: AbortSignal`：配合 `AbortController` 手动取消/中断重复请求（如搜索防抖、Tab 快速切换）。
  - `onUploadProgress` / `onDownloadProgress`：获取上传/下载进度回调。

### 常见场景示例

```typescript
// 场景 1：特殊接口跳过全局错误 Toast，在 catch 中自定义弹窗或降级逻辑
try {
  await createUser(formValues, { skipBusinessError: true });
} catch (error: any) {
  // 全局 Toast 已自动跳过，在此处编写自定义错误逻辑
  showCustomErrorModal(error.message);
}

// 场景 2：生成方法缺少 responseType 时，在第二参数顶层兜底
const res = await downloadReport(params, {
  responseType: 'blob',
  headers: { 'x-export-format': 'xlsx' },
});

// 场景 3：长耗时计算接口单独设置超时
await calculateReport(params, {
  timeout: 120000, // 2分钟
});

// 场景 4：手动取消/中断未完成的请求（如快速输入/Tab切换）
const controller = new AbortController();
await pageUsers(query, { signal: controller.signal });
// 取消上一次请求：controller.abort();
```

## 标准代码骨架

API 集成推荐将请求和加载状态封装在 Composable hook 中：

```ts
import { ref } from 'vue';
import { fetchUserDetail } from '@/api/user';
import type { UserDetail } from '@/api/model';

export function useUserDetail() {
  const loading = ref(false);
  const data = ref<UserDetail | null>(null);

  const loadData = async (id: string) => {
    loading.value = true;
    try {
      const res = await fetchUserDetail(id);
      data.value = res;
    } finally {
      loading.value = false;
    }
  };

  return { loading, data, loadData };
}
```

## 交付检查清单

- [ ] 接口、类型都来自 Orval 生成产物。
- [ ] hook 使用具名 API 导入，无 `getApi()` 调用。
- [ ] 请求逻辑在 hook 中集中管理。
- [ ] 分页和筛选参数映射明确。
- [ ] 组件层没有使用未确认的远程请求 API。
- [ ] 异常和空数据状态有一致处理。
- [ ] 调用层只关心业务状态，不直连 API 细节。
- [ ] 接口返回的任何 `number` 字段都没有被 `Number()`/`parseInt`/`parseFloat`/`+`/`*1`/`~~` 等任何方式转换（json-bigint 已存为字符串，一律保持字符串）。
- [ ] 文件导出下载已按 `file-export-download` 检查生成方法、Blob 配置、响应头和 `handleBlobResponse`。

## 失败兜底策略

- 接口字段不稳定时，先做最小兼容映射并记录 TODO，不在页面散落兼容逻辑。
- 类型冲突时，优先更新 Orval 产物，再考虑局部类型断言。
- 后端异常频繁时，先保证错误提示与重试入口可用。
- 文件下载响应类型或文件名异常时，按 `file-export-download` 从 OpenAPI、生成方法、mutator 和响应头逐层排查。
