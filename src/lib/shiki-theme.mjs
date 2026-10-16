// @ts-check
/**
 * メモ（Markdown）のコードブロック用 Shiki テーマ（紫基調）。
 * サイトの配色（src/styles/global.css の :root）に合わせています。
 */
/** @type {NonNullable<import('astro').ShikiConfig['theme']>} */
export const juckTheme = {
  name: 'juck-purple',
  type: 'dark',
  colors: {
    'editor.background': '#0d0817',
    'editor.foreground': '#e8defc',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#8a7bb0', fontStyle: 'italic' } },
    { scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'], settings: { foreground: '#e879f9' } },
    { scope: ['keyword.operator'], settings: { foreground: '#ff9bd8' } },
    { scope: ['string', 'string.quoted', 'string.template', 'markup.inline.raw'], settings: { foreground: '#9ef0c9' } },
    { scope: ['constant.character.escape', 'string.regexp'], settings: { foreground: '#ffd479' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.other', 'support.constant'], settings: { foreground: '#ffb38a' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call.generic'], settings: { foreground: '#c4a1ff' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: '#8fc2ff' } },
    { scope: ['variable.parameter'], settings: { foreground: '#f5c2ff' } },
    { scope: ['variable', 'variable.other', 'meta.definition.variable'], settings: { foreground: '#e8defc' } },
    { scope: ['entity.name.tag'], settings: { foreground: '#e879f9' } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#c4a1ff' } },
    { scope: ['punctuation', 'meta.brace'], settings: { foreground: '#b3a5d6' } },
    { scope: ['markup.heading', 'entity.name.section'], settings: { foreground: '#c4a1ff', fontStyle: 'bold' } },
    { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
    { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
    { scope: ['markup.deleted'], settings: { foreground: '#ff6b9a' } },
    { scope: ['markup.inserted'], settings: { foreground: '#9ef0c9' } },
    { scope: ['invalid'], settings: { foreground: '#ff6b9a' } },
  ],
};
