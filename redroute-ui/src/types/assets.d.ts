// Allows importing .avif assets in TS
declare module "*.avif" {
  const src: string;
  export default src;
}
