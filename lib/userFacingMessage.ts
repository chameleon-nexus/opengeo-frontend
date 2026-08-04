/** 后端错误可能含内部引擎名，展示给用户前须脱敏 */
const INTERNAL_PUBLISH_ENGINE = /postiz/i;

export function scrubInternalPublishTerms(message: string): string {
  if (INTERNAL_PUBLISH_ENGINE.test(message)) {
    return '出海发稿服务暂不可用，请联系运维或稍后再试。';
  }
  return message;
}
