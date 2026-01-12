# Mimi Player


> A lightweight, dependency-free JavaScript library to play music from the `.mimi` text-based format.

Mimi Playerは、シンプルで人間が読み書きできる音楽フォーマット `.mimi` のための再生ライブラリです。Web Audio APIを使用して、テキストで書かれた楽譜をリアルタイムで音声に合成します。

**[Mimi Composer Demo](https://aruihayoru.github.io/mimi/maker/)** (←デモのURLに合わせて変更してください)

## What is the `.mimi` format?

`.mimi` (Music instrument minimal interface) は、1行が1つの音符に対応する、非常にシンプルなテキストベースの音楽フォーマットです。

- **ファイル拡張子**: `.mimi`
- **エンコーディング**: UTF-8推奨
- **構造**:
  - 各行はカンマ `,` で区切られたパラメータで1つの音符を定義します。
  - `#` で始まる行はコメントとして無視されます。
  - 空行は無視されます。
  - 行の順序は再生に影響しません。`Start`パラメータがすべてを決定します。

### Parameters

| # | Parameter | Format      | Description                                                                                             | Default |
|---|-----------|-------------|---------------------------------------------------------------------------------------------------------|---------|
| 1 | **Type**  | Hex `00-04` | 音の種類 (Waveform) <br> `00`: Sine, `01`: Triangle, `02`: Square, `03`: Sawtooth, `04`: Noise             | -       |
| 2 | **Pitch** | Hex `00-FF` | 音の高さ (MIDI Note Number) <br> 例: `3C` = C4 (中央のド)                                                 | -       |
| 3 | **Length**| Hex `0000-FFFF` | 音の長さ (フレーム数) <br> 1フレーム = 1/24秒 (デフォルト)                                                  | -       |
| 4 | **Start** | Hex `00..-FF..` | 開始地点 (フレーム数) <br> 曲の先頭からのフレーム数                                                          | -       |
| 5 | **Volume**| Hex `00-FF` | 音量 (省略可) <br> `00`: 無音, `FF`: 最大                                                                | `FF`    |
| 6 | **Pan**   | Hex `00-FF` | パンニング (省略可) <br> `00`: 左, `80`: 中央, `FF`: 右                                                   | `80`    |
| * | Extra     | Any         | 7列目以降のデータは無視されます。                                                                       | -       |

### Header (Recommended)
ファイル冒頭に、曲の情報をコメントとして記載することを推奨します。
```
# Mimi Music Format v1.0
# Title: My Awesome Song
# Tempo: 120BPM (1beat = 12frames / 1bar = 48frames)
# Type, Pitch, Length, Start, Volume, Pan
```

## Features

- **超軽量**: Minify版は約4KBです。
- **依存ライブラリなし**: Vanilla JavaScriptのみで動作します。
- **直感的**: テキストエディタだけで作曲が可能です。
- **柔軟**: 和音、ステレオパンニングに対応し、後からの編集も簡単です。

## Installation

### Option 1: Use via CDN (Recommended)

最も簡単で推奨される方法です。以下の`<script>`タグをHTMLに追加するだけで、Mimi Playerが利用可能になります。

```html
<script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.min.js"></script>
```

### Option 2: Download Manually

このリポジトリから `mimi.js` または `mimi.min.js` をダウンロードし、プロジェクトに配置します。

```bash
# Clone the repository
git clone https://github.com/AruihaYoru/mimi.git
```

そして、あなたのHTMLファイルからスクリプトを読み込みます。

```html
<script src="path/to/mimi.min.js"></script>
```

## Usage (Quick Start)

1. `MimiPlayer` のインスタンスを作成します。
2. `.mimi` 形式のテキストデータを `player.load()` で読み込みます。
3. `player.play()` で再生します。

```html
<!DOCTYPE html>
<html>
<head>
    <title>Mimi Player Demo</title>
</head>
<body>
    <textarea id="mimi-code" rows="10" cols="60">
# Type, Pitch, Length, Start, Volume, Pan
00, 3C, 000C, 0000, FF  # C4 for 0.5s at 0s
01, 40, 000C, 000C, FF  # E4 for 0.5s at 0.5s
02, 43, 0018, 0018, 80  # G4 for 1.0s at 1.0s, half volume
    </textarea>
    <br>
    <button id="play-btn">Play</button>
    <button id="stop-btn">Stop</button>

    <!-- Load Mimi Player from CDN -->
    <script src="https://cdn.jsdelivr.net/gh/AruihaYoru/mimi@main/mimi.min.js"></script>
    
    <script>
        const player = new MimiPlayer();
        const mimiCodeEl = document.getElementById('mimi-code');

        document.getElementById('play-btn').addEventListener('click', () => {
            // AudioContext may require user interaction to start
            player.audioCtx.resume().then(() => {
                player.load(mimiCodeEl.value);
                player.play();
            });
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            player.stop();
        });
    </script>
</body>
</html>
```

## API Reference

### `new MimiPlayer(fps)`
MimiPlayerの新しいインスタンスを作成します。
- `fps` (Number, Optional, Default: `24`): 1秒あたりのフレーム数。タイミング計算の基準となります。

### Methods

- `.load(text)`: `.mimi`形式の文字列をパースしてプレイヤーに読み込みます。
  - `text` (String): `.mimi`形式のデータ。
- `.play(startFrame)`: 読み込まれた音楽の再生を開始します。
  - `startFrame` (Number, Optional, Default: `0`): 再生を開始するフレーム位置。
- `.stop()`: 再生を即座に停止します。
- `.getCurrentFrame()`: 現在の再生フレーム位置を返します。

### Properties

- `.isPlaying` (Boolean): 現在再生中かどうかを示す読み取り専用のプロパティ。

### Event Handlers

- `.onPlay`: `play()`が呼ばれ、再生が開始されたときに実行されるコールバック関数をセットします。
- `.onStop`: `stop()`が呼ばれ、再生が停止したときに実行されるコールバック関数をセットします。
- `.onEnd`: 曲が最後まで再生され、自然に停止したときに実行されるコールバック関数をセットします。

**Example:**
```javascript
player.onPlay = () => console.log('Playback started!');
player.onStop = () => console.log('Playback stopped.');
player.onEnd = () => console.log('The song has finished.');
```

## Related Projects

- **[Mimi Composer](https://github.com/AruihaYoru/mimi/tree/main/maker)**: A web-based visual editor for creating and editing `.mimi` music files. Try it out!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.# mimi
