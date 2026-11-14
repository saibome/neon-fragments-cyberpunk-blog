/**
 * 根级 catch-all：匹配所有未命中静态资源与具体函数路由的路径。
 * 平台按文件名生成 /* 兜底路由；同时导出命名 onRequest 与 default，
 * 兼容 EdgeOne 对「Function Handlers」与「默认导出」两种入口识别方式。
 */
export { onRequest, onRequest as default } from './_lib/handler.js';
