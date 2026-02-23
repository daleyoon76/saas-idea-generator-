declare module 'html-to-docx' {
  function HTMLToDocx(
    html: string,
    headerHTML?: string | null,
    options?: Record<string, unknown>,
    footerHTML?: string | null
  ): Promise<Buffer | Blob>;
  export default HTMLToDocx;
}
