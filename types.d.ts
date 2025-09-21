/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />
declare module "js-yaml" {
  const v: any;
  export default v;
}
// (Optional codecs are injected via globals in tests/apps if needed.)
