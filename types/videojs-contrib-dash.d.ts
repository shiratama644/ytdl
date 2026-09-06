// videojs-contrib-dash は型定義を同梱していないため、ここでモジュールを宣言する。
// （video.js 本体の型（Player 等）は video.js が同梱している。）
declare module 'videojs-contrib-dash' {
  // このモジュールは呼び出すと video.js に DASH ソースハンドラを登録する副作用を持つ
  const _default: unknown;
  export default _default;
}
