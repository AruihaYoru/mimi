# Mimi Player (v2)

> A lightweight, dependency-free JavaScript library to play music from the `.mimi` text-based format.

Mimi Playerは、シンプルで人間が読み書きできる音楽フォーマット `.mimi` のための再生ライブラリです。Web Audio APIを使用し、**FM音源、物理モデル音源、SuperSaw、PCMドラム** などをリアルタイムで合成します。

**[Mimi Composer Demo](https://aruihayoru.github.io/mimi)**

## What is the `.mimi` format?

`.mimi` (Music instrument minimal interface) は、1行が1つの音符に対応する、テキストベースの音楽フォーマットです。
V2フォーマットでは、レトロなチップチューンから現代的なシンセサウンドまでを表現するために拡張されています。

- **ファイル拡張子**: `.mimi`
- **エンコーディング**: UTF-8推奨
- **基本ルール**:
  - 各行はカンマ `,` で区切られたパラメータで1つの音符を定義します。
  - `#` で始まる行はコメントです。
  - バージョン指定のために、ファイル先頭に `# Mimi Music Format v2.0` を記述する必要があります。

### Parameters (Version 2.0)

| # | Parameter | Format      | Description                                                                                             | Default |
|---|-----------|-------------|---------------------------------------------------------------------------------------------------------|---------|
| 1 | **Type**  | Hex `00-0F` | 音色ID (詳細は Instrument List を参照)                                                                  | -       |
| 2 | **Pitch** | Hex `00-FF` | 音程 (MIDI Note Number) <br> 例: `3C` = C4 (中央ド), `45` = A4 (440Hz)                                  | -       |
| 3 | **Length**| Hex `0000..`| 音の長さ (フレーム数) <br> 1フレーム = 1/24秒 (デフォルト)                                              | -       |
| 4 | **Start** | Hex `0000..`| 再生開始位置 (フレーム数)                                                                               | -       |
| 5 | **Volume**| Hex `00-FF` | 音量 (0.0 - 1.0) <br> `80`: 50%, `FF`: 100%                                                             | `FF`    |
| 6 | **Pan**   | Hex `00-FF` | 定位 (L - R) <br> `00`: 左, `80`: 中央, `FF`: 右                                                        | `80`    |
| 7 | **Attack**| Hex `00..`  | アタックタイム (フレーム数) <br> 音の立ち上がり時間                                                     | `01`    |
| 8 | **Release**| Hex `00..` | リリースタイム (フレーム数) <br> 音の余韻                                                               | `01`    |
| * | **Slide** | `; Hex`     | ポルタメント (行末にセミコロン `;` で区切って指定) <br> 指定フレームかけてピッチを移動                  | `0`     |

#### Instrument List (Type)

| Type (Hex) | Name           | Description |
|------------|----------------|-------------|
| `00` - `03`| Basic Wave     | Sine, Triangle, Square, Sawtooth (基本波形) |
| `04` - `06`| Noise          | White, Pink, Low-fi Noise |
| `07` - `09`| Pulse          | Pulse Wave (Duty: 12.5%, 25%, 50%) |
| `0A`       | FM Growl       | FMベース/ダブステップ系ベース |
| `0B`       | FM Metallic    | FMベル/金属的な音色 |
| `0C`       | SuperSaw       | デチューンされた7つの鋸波 (トランス系リード) |
| `0D`       | Short Noise    | ハイハット/パーカッション用ノイズ |
| `0E`       | Pluck          | 物理モデル音源 (弦楽器/ギターのような音) |
| `0F`       | Hex PCM        | 4bit PCM再生 (ドラム/ボイス用) ※特殊構文 |

### Special Syntax: Type 0F (Hex PCM)

Type `0F` は特殊なフォーマットを使用します。`Pitch`や`Length`の代わりに、直接波形データを指定します。

```
# Type, Start, HexData string...
0F, 10, 89ABCDE...
```
- データは `0`-`F` の16進数文字列です（`8`が無音/センター）。
- サンプリングレートは8000Hz相当で再生されます。
- エンコードには、`./mimi_hex`に`input.mp3`を配置し、`convert.py`を実行することで作成できます。

## Features

- **Hybrid Synthesis**: 減算合成、FM合成、物理モデル合成(Karplus-Strong)を1つのエンジンに統合。
- **Hex Audio**: テキストデータとして短いサンプリング音声（ドラム等）を埋め込み可能。
- **Modular Design**: V1エンジンとV2エンジンを自動で切り替えるラッパー構成。
- **Lightweight**: 全機能を合わせても軽量で、外部ライブラリに依存しません。

## Installation

Mimi Player V2を使用するには、以下の4つのファイルを読み込む必要があります。順序が重要です。

```html
<!-- 1. PCM Decoder -->
<script src="path/to/mimi.hex.min.js"></script>
<!-- 2. Legacy Engine (for v1 compatibility) -->
<script src="path/to/mimi.v1.min.js"></script>
<!-- 3. Modern Engine -->
<script src="path/to/mimi.v2.min.js"></script>
<!-- 4. Wrapper & Loader -->
<script src="path/to/mimi.min.js"></script>
```

### via CDN

```html
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.hex.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.v1.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.v2.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.min.js"></script>
```

## Usage

APIはV1から変更ありません。`MimiPlayer` クラスが自動的にバージョンを判別して適切なエンジンを起動します。

```javascript
// 1. インスタンス作成 (FPS指定可: デフォルト24)
const player = new MimiPlayer(24);

// 2. データのロード (非同期処理)
// テキストヘッダーを見て自動的に V1/V2 エンジンが選択されます
const mml = `
# Mimi Music Format v2.0
# Title: Demo Song
# Tempo: 120

# SuperSaw Lead with Slide
0C, 3C, 0C, 00, FF, 80, 02, 08 ; 06
0C, 43, 0C, 0C, FF, 80, 02, 08

# FM Bass
0A, 24, 06, 00, E0, 80
0A, 24, 06, 06, E0, 80
`;

await player.load(mml);

// 3. 再生
player.play();

// 4. 停止
// player.stop();
```

## API Reference

### `class MimiPlayer(fps)`

- **constructor(fps = 24)**
  - プレイヤーを初期化します。`fps` は1秒あたりのフレーム数（テンポの分解能）です。

### Methods

- **async `load(text)`**
  - MMLテキストを解析し、波形生成の準備を行います。
  - ヘッダー (`# Mimi Music Format vX.X`) に基づきエンジンを切り替えます。
- **`play(startFrame = 0)`**
  - 再生を開始します。
  - ブラウザの制限により、ユーザー操作（クリックイベント等）の中で呼び出すか、事前に `AudioContext` を resume しておく必要があります。
- **`stop()`**
  - 再生を停止し、すべての発音中のノートをカットします。

### Properties

- **`version`**: 現在ロードされているエンジンのバージョン (`"1.0"` or `"2.0"`).
- **`activeNodes`**: 現在発音中のWeb AudioノードのSet（デバッグ用）.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.