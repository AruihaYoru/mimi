document.addEventListener('DOMContentLoaded', () => {

    // --- A. グローバル / DOM要素 ---
    const player = new MimiPlayer();
    const FPS = 24; // MimiPlayerのデフォルトに合わせる

    // --- DOM Elements ---
    const songTitleEl = document.getElementById('song-title');
    const songTempoEl = document.getElementById('song-tempo');
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    
    const volumeSlider = document.getElementById('note-volume');
    const volumeValueEl = document.getElementById('volume-value');
    const panSlider = document.getElementById('note-pan');
    const panValueEl = document.getElementById('pan-value');

    const pianoKeysContainer = document.getElementById('piano-keys');
    const pianoRollContainer = document.getElementById('piano-roll-container');
    const pianoRollGrid = document.getElementById('piano-roll-grid');
    const mimiOutputEl = document.getElementById('mimi-output');

    // --- B. 状態管理 (Song Data) ---
    // これがアプリケーションの全ての情報の原本 (Single Source of Truth)
    let songData = {
        meta: {
            title: 'Untitled',
            tempo: 120,
        },
        notes: [],
    };
    let nextNoteId = 0;
    
    // --- C. 初期化処理 ---
    function init() {
        setupEventListeners();
        drawPianoKeys();
        updateTempo();
        updateAll();
        
        console.log('Mimi Composer Initialized!');
    }

    // --- D. 描画 & 更新関数 ---
    
    /** ピアノロールの左側の鍵盤を描画する */
    function drawPianoKeys() {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const MAX_PITCH = 108; // C8
        const MIN_PITCH = 21;  // A0
        
        pianoKeysContainer.innerHTML = ''; // Clear existing keys
        for (let pitch = MAX_PITCH; pitch >= MIN_PITCH; pitch--) {
            const key = document.createElement('div');
            key.classList.add('piano-key');
            
            const noteIndex = pitch % 12;
            const octave = Math.floor(pitch / 12) - 1;
            
            if ([1, 3, 6, 8, 10].includes(noteIndex)) {
                key.classList.add('black');
            } else {
                key.classList.add('white');
            }
            if (noteIndex === 0) {
                key.classList.add('c-key');
                key.textContent = `C${octave}`;
                key.dataset.octave = octave;
            }
            
            pianoKeysContainer.appendChild(key);
        }
    }
    
    /** songData.notes 配列を元に、ピアノロール上のノートブロックを再描画する */
    function renderNotes() {
        pianoRollGrid.innerHTML = ''; // Clear existing notes
        const pixelsPerFrame = calculatePixelsPerFrame();

        songData.notes.forEach(note => {
            const noteBlock = document.createElement('div');
            noteBlock.className = `note-block note-type-${note.type}`;
            noteBlock.dataset.noteId = note.id;
            
            const top = (108 - note.pitch) * 20; // 20 is --piano-key-height
            const left = note.start * pixelsPerFrame;
            const width = note.length * pixelsPerFrame;

            noteBlock.style.top = `${top}px`;
            noteBlock.style.left = `${left}px`;
            noteBlock.style.width = `${width}px`;

            pianoRollGrid.appendChild(noteBlock);
        });
    }
    
    /** songDataを元に、Mimiコードを生成してテキストエリアに表示する */
    function updateMimiOutput() {
        const { title, tempo } = songData.meta;
        const framesPerBeat = (60 / tempo) * FPS;
        const framesPerBar = framesPerBeat * 4;

        let output = `# Mimi Music Format v1.0\n`;
        output += `# Title: ${title}\n`;
        output += `# Tempo: ${tempo}BPM (1beat = ${framesPerBeat.toFixed(2)}frames / 1bar = ${framesPerBar.toFixed(2)}frames)\n`;
        output += `# Type, Pitch, Length, Start, Volume, Pan\n\n`;

        // Startでソートして出力
        const sortedNotes = [...songData.notes].sort((a, b) => a.start - b.start);

        sortedNotes.forEach(note => {
            const type = note.type.toString(16).toUpperCase().padStart(2, '0');
            const pitch = note.pitch.toString(16).toUpperCase().padStart(2, '0');
            const length = note.length.toString(16).toUpperCase().padStart(4, '0');
            const start = note.start.toString(16).toUpperCase().padStart(8, '0');
            const volume = note.volume.toString(16).toUpperCase().padStart(2, '0');
            const pan = note.pan.toString(16).toUpperCase().padStart(2, '0');
            output += `${type}, ${pitch}, ${length}, ${start}, ${volume}, ${pan}\n`;
        });
        
        mimiOutputEl.value = output;
    }
    
    /** テンポの変更をUIに反映させる */
    function updateTempo() {
        const { tempo } = songData.meta;
        const framesPerBeat = (60 / tempo) * FPS;
        const pixelsPerBeat = framesPerBeat * calculatePixelsPerFrame();
        
        // Vertical grid lines
        const totalFrames = 8 * 4 * framesPerBeat; // 8 bars
        const gridWidth = totalFrames * calculatePixelsPerFrame();
        pianoRollGrid.style.width = `${gridWidth}px`;
        //
        // NOTE: More advanced vertical line drawing would go here
        // For simplicity, we keep it basic for now.
    }

    /** UIの状態を更新するマスター関数 */
    function updateAll() {
        renderNotes();
        updateMimiOutput();
    }


    // --- E. イベントハンドラ ---
    function setupEventListeners() {
        // Global Controls
        songTitleEl.addEventListener('input', e => { songData.meta.title = e.target.value; updateMimiOutput(); });
        songTempoEl.addEventListener('change', e => { songData.meta.tempo = parseInt(e.target.value); updateTempo(); updateMimiOutput(); });
        playBtn.addEventListener('click', handlePlay);
        stopBtn.addEventListener('click', handleStop);
        exportBtn.addEventListener('click', handleExport);
        importBtn.addEventListener('click', handleImport);

        // Tool Palette
        volumeSlider.addEventListener('input', e => volumeValueEl.textContent = e.target.value);
        panSlider.addEventListener('input', handlePanSlider);

        // Piano Roll
        pianoRollGrid.addEventListener('click', handleGridClick);
        pianoRollContainer.addEventListener('scroll', () => {
             pianoKeysContainer.scrollTop = pianoRollContainer.scrollTop;
        });
    }
    
    function handlePlay() {
        player.audioCtx.resume().then(() => {
            player.load(mimiOutputEl.value);
            player.play();
        });
    }
    
    function handleStop() {
        player.stop();
    }
    
    function handleExport() {
        const blob = new Blob([mimiOutputEl.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${songData.meta.title.replace(/\s/g, '_') || 'music'}.mimi`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    function handleImport() {
        try {
            const text = prompt("Paste your Mimi code here:");
            if (text === null) return;
            
            const lines = text.split('\n');
            const newNotes = [];
            let idCounter = 0;

            lines.forEach(line => {
                if (line.startsWith('#')) {
                    // Basic header parsing
                    const titleMatch = line.match(/# Title: (.*)/);
                    if (titleMatch) {
                        songData.meta.title = titleMatch[1].trim();
                        songTitleEl.value = songData.meta.title;
                    }
                    const tempoMatch = line.match(/# Tempo: (\d+)/);
                    if (tempoMatch) {
                        songData.meta.tempo = parseInt(tempoMatch[1]);
                        songTempoEl.value = songData.meta.tempo;
                    }
                    return;
                }
                
                const parts = line.split(',').map(s => s.trim());
                if (parts.length < 4) return;
                
                newNotes.push({
                    id: idCounter++,
                    type: parseInt(parts[0], 16),
                    pitch: parseInt(parts[1], 16),
                    length: parseInt(parts[2], 16),
                    start: parseInt(parts[3], 16),
                    volume: parts[4] ? parseInt(parts[4], 16) : 255,
                    pan: parts[5] ? parseInt(parts[5], 16) : 128,
                });
            });
            
            songData.notes = newNotes;
            nextNoteId = idCounter;
            updateTempo();
            updateAll();

        } catch (e) {
            alert('Failed to parse Mimi code. Please check the format.');
            console.error(e);
        }
    }
    
    function handlePanSlider(e) {
        const val = parseInt(e.target.value);
        let text = val;
        if (val === 128) text = "128 (Center)";
        else if (val < 10) text = `${val} (Left)`;
        else if (val > 245) text = `${val} (Right)`;
        panValueEl.textContent = text;
    }
    
    function handleGridClick(e) {
        // Prevent adding note when clicking on an existing note block
        if (e.target.classList.contains('note-block')) return;

        const rect = pianoRollGrid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const pitch = 108 - Math.floor(y / 20); // 20 is note height
        const start = Math.round(x / calculatePixelsPerFrame());

        const type = parseInt(document.querySelector('input[name="waveform"]:checked').value);
        const lengthStr = document.querySelector('input[name="note-length"]:checked').value;
        const volume = parseInt(volumeSlider.value);
        const pan = parseInt(panSlider.value);

        const framesPerBeat = (60 / songData.meta.tempo) * FPS;
        let length;
        if (lengthStr === '1/16') length = Math.round(framesPerBeat / 4);
        else if (lengthStr === '1/8') length = Math.round(framesPerBeat / 2);
        else length = Math.round(framesPerBeat); // 1/4

        const newNote = { id: nextNoteId++, type, pitch, start, length, volume, pan };
        songData.notes.push(newNote);

        updateAll();
    }
    
    // --- F. ユーティリティ関数 ---
    
    /** テンポに基づいて1フレームあたりのピクセル数を計算 */
    function calculatePixelsPerFrame() {
        // This value determines the "zoom" level of the piano roll.
        // Let's fix it for simplicity, e.g., 1 beat = 120px
        const framesPerBeat = (60 / songData.meta.tempo) * FPS;
        const pixelsPerBeat = 120;
        return pixelsPerBeat / framesPerBeat;
    }


    // --- G. アプリケーション起動 ---
    init();

});