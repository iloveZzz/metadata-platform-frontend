---
name: file-export-download
description: 指导 Vue3 YSS UI 微应用实现文件导出、报表下载、模板下载和附件下载，覆盖 OpenAPI binary 响应、Orval 生成方法检查、responseType blob 兜底、Blob 响应类型、Content-Disposition 文件名、handleBlobResponse、loading 与错误处理；当需求出现导出、下载、Excel、CSV、PDF、ZIP、Blob 或文件流时使用。
---

# YSS 文件导出下载 Skill

## 触发条件

- 页面需要导出 Excel、CSV、PDF、ZIP、报表、密钥文件或其他二进制文件。
- 页面需要下载导入模板、附件或后端动态生成的文件。
- Orval 生成接口的返回值是 `Blob`，或业务调用需要配置 `responseType: 'blob'`。
- 代码正在手写 `URL.createObjectURL`、解析 `Content-Disposition`、拼接文件名或调用 `downloadFileStream`。

## 不适用场景

- 仅上传文件，不包含模板下载或导出流程。
- 下载公开静态 URL 且无需鉴权、请求参数和响应头文件名时，使用 `downloadFileFromUrl(url, fileName?)`。
- 浏览器只需要预览远程 PDF/图片，不触发文件保存。

## 必读依据

- 通用接口规则：`../api-integration/SKILL.md`。
- 当前项目：`openapi/openapi.json`、Orval 配置、生成后的 API 方法和 `packages/src/api/mutator.ts`。
- YSS Utils 最新文档：`llms-full.txt` 的文件下载章节。

## 决策流程

1. 在 OpenAPI 中定位导出接口，优先把成功响应声明为二进制媒体类型和 `format: binary`。
2. 重新生成 API 后检查生成方法，而不是凭接口名称判断：
   - 已包含 `responseType: 'blob'`：业务调用不必重复传第二参数。
   - 未包含 `responseType: 'blob'`：业务调用必须传第二参数 `{ responseType: 'blob' }`。
3. 检查 mutator：Blob 成功响应必须保留 `{ data, headers }`；后端以 Blob 返回 JSON 错误时，应在响应拦截器统一解析并 reject。
4. 在业务 hook 中设置 loading、防重复点击，调用生成 API，再执行 `handleBlobResponse(res.data, res.headers)`。
5. 验证文件名、文件内容、错误响应和连续点击，不只验证浏览器出现了下载任务。

> OpenAPI 标准通过响应 `content` 和 `format: binary` 表达二进制，不直接使用 Axios 的 `responseType` 字段。最终以 Orval 生成方法是否含 `responseType: 'blob'` 为判断依据。

## 硬约束（禁止/必须）

- 必须优先导入 `import { handleBlobResponse } from '@yss-ui/utils';` 处理接口文件流。
- 必须调用 `handleBlobResponse(res.data, res.headers)`；它会自动兼容响应头大小写，并解析 RFC 5987 `filename*` 与普通 `filename`。
- 第三个 `hasUtf8Encoding` 参数已弃用，禁止继续传递。
- 生成方法缺少 Blob 配置时，必须在第二参数顶层传 `{ responseType: 'blob' }`；禁止放进 `headers`、请求 body 或查询参数。
- 生成方法已包含 Blob 配置时，禁止为“保险”重复传相同配置；先保持 OpenAPI 契约和生成产物正确。
- 禁止修改 Orval 生成文件补写 `responseType`，因为重新生成会覆盖；应修正 OpenAPI，或在业务调用第二参数临时兜底。
- 禁止依赖 URL 中包含 `download/export` 的请求拦截器猜测响应类型；接口可能不按该名称命名。
- 禁止在业务层重复实现 `getFileNameFromContentDisposition`、`downloadFileStream`、`URL.createObjectURL` 和 `<a download>` 流程。
- 必须保留响应头；只取 `res.data` 会丢失服务端文件名。
- Blob 接口失败时遵循全局 mutator 错误处理，禁止在 catch 中重复 `message.error`；成功下载后可提示 `message.success`。
- 必须用独立 loading 状态防止重复导出，并在 `finally` 中恢复。
- 不得默认传 `skipBusinessError` 或 `skipErrorHandler`；只有明确需要业务自定义错误体验时才使用。

## OpenAPI 标准代码骨架

```json
{
  "responses": {
    "200": {
      "description": "导出成功",
      "headers": {
        "Content-Disposition": {
          "schema": { "type": "string" }
        }
      },
      "content": {
        "application/octet-stream": {
          "schema": {
            "type": "string",
            "format": "binary"
          }
        }
      }
    }
  }
}
```

根据文件类型可将媒体类型换成 `text/csv`、`application/pdf` 或 Excel 对应类型。跨域请求若读取不到文件名，后端还必须暴露 `Content-Disposition` 响应头。

## 标准代码骨架

### 生成方法已包含 responseType

```typescript
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { handleBlobResponse } from '@yss-ui/utils';
import { downloadAccessSecret } from '@/api/generated/quality';

/** 微应用 mutator 返回的文件下载响应。 */
type BlobDownloadResponse = {
  data: Blob;
  headers: Record<string, string>;
};

/** 文件下载进行中状态。 */
const downloading = ref(false);

/** 下载密钥文件。 */
const downloadFile = async (key: string): Promise<void> => {
  if (downloading.value) return;

  downloading.value = true;
  try {
    const res = (await downloadAccessSecret(
      key
    )) as unknown as BlobDownloadResponse;
    handleBlobResponse(res.data, res.headers);
    message.success('下载成功');
  } catch (error) {
    console.error('下载失败:', error);
  } finally {
    downloading.value = false;
  }
};
```

### 生成方法缺少 responseType

只改调用行，其他流程保持一致：

```typescript
const res = (await downloadAccessSecret(key, {
  responseType: 'blob',
})) as unknown as BlobDownloadResponse;
```

若 mutator 与 Orval 返回类型已经准确声明为 `{ data: Blob; headers: ... }`，直接使用生成类型，删除不必要的类型断言。

## 响应约定

- 后端成功响应应返回真实文件流，并设置 `Content-Disposition: attachment; filename*=UTF-8''...`。
- mutator 对 Blob 成功响应返回 `{ data, headers }`，以便 `handleBlobResponse` 获取文件名。
- 后端业务失败即使返回 Blob 包装的 JSON，也应由 mutator 解析并 reject，业务 hook 不负责重复解析。
- `handleBlobResponse` 找不到文件名时会使用 `download`；应优先补齐后端响应头，而不是在每个页面手写解析逻辑。

## 交付检查清单

- [ ] 已检查 OpenAPI 二进制响应声明和 Orval 生成方法。
- [ ] 仅在生成方法缺少配置时，第二参数传入了 `{ responseType: 'blob' }`。
- [ ] 已从 `@yss-ui/utils` 导入并调用 `handleBlobResponse(res.data, res.headers)`。
- [ ] 未修改 Orval 生成文件，未重复实现文件名解析或浏览器下载逻辑。
- [ ] Blob 成功响应保留了 `data` 与 `headers`，类型断言只位于 API 边界。
- [ ] 已处理 loading、防重复点击和 `finally` 恢复。
- [ ] 未在 catch 中重复业务错误 Toast。
- [ ] 中文文件名、普通文件名和缺失文件名场景均已验证。
- [ ] Blob 包装的 JSON 错误会 reject，不会被误下载成文件。
- [ ] 下载文件可以正常打开，格式和内容与接口预期一致。

## 失败兜底策略

- 生成方法不支持第二参数时，先确认 Orval `options: true`；修正配置并重新生成，禁止手改生成文件。
- `res.headers` 为空时，检查 mutator 是否错误地只返回 `data`，以及后端/CORS 是否暴露 `Content-Disposition`。
- 下载到 JSON 错误文件时，在 mutator 中统一补充 Blob 错误解析，禁止把解析逻辑复制到每个业务 hook。
- 文件名始终为 `download` 时，优先修复后端 `Content-Disposition`；无法改后端时再评估统一扩展 YSS 下载工具。
- 超大文件导致内存压力时，改用后端临时 URL、分片或流式下载方案，不强行把全部内容载入 Blob。
