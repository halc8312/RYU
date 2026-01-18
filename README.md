# RYU - 流体シミュレーション (Fluid Simulation)

インタラクティブな2D流体シミュレーションです。マウスやタッチでリアルタイムに流体を操作できます。

An interactive 2D fluid simulation. Control the fluid in real-time with your mouse or touch.

## デモ (Demo)

このシミュレーションはGitHub Pagesで動作します。

This simulation works on GitHub Pages.

## 特徴 (Features)

- リアルタイムの流体シミュレーション (Real-time fluid simulation)
- Navier-Stokes方程式に基づく物理演算 (Physics based on Navier-Stokes equations)
- マウス/タッチによるインタラクション (Mouse/touch interaction)
- パラメータ調整可能 (Adjustable parameters)
  - 粘性 (Viscosity)
  - 拡散率 (Diffusion)
- レスポンシブデザイン (Responsive design)

## 使い方 (Usage)

1. マウスをドラッグして流体を動かす (Drag your mouse to move the fluid)
2. スライダーで物理パラメータを調整 (Adjust physics parameters with sliders)
3. クリアボタンで画面をリセット (Reset with the clear button)

## 技術仕様 (Technical Details)

- HTML5 Canvas
- Pure JavaScript (No dependencies)
- Jos Stam's stable fluids algorithm
- モバイル対応 (Mobile support)

## ローカルで実行 (Run Locally)

このプロジェクトは静的なHTMLファイルなので、任意のウェブサーバーで実行できます:

This project consists of static HTML files, so you can run it with any web server:

```bash
# Pythonの場合 (Using Python)
python -m http.server 8000

# Node.jsの場合 (Using Node.js)
npx serve
```

その後、ブラウザで `http://localhost:8000` を開いてください。

Then open `http://localhost:8000` in your browser.

## ライセンス (License)

MIT