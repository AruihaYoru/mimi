import numpy as np
from pydub import AudioSegment
import sys
def mimi_to_mp3(input_file, output_file="output.mp3"):
    SAMPLE_RATE = 44100
    FPS = 24
    FRAME_TIME = 1.0 / FPS
    notes = []
    max_frame = 0
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.split('#')[0].strip()
                if not line:
                    continue
                cols = [c.strip() for c in line.split(',')]
                if len(cols) < 4:
                    continue
                note = {
                    'type':   int(cols[0], 16),
                    'pitch':  int(cols[1], 16),
                    'length': int(cols[2], 16),
                    'start':  int(cols[3], 16),
                    'volume': int(cols[4], 16) if len(cols) > 4 else 255,
                    'pan':    int(cols[5], 16) if len(cols) > 5 else 128
                }
                notes.append(note)
                max_frame = max(max_frame, note['start'] + note['length'])
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    total_samples = int(SAMPLE_RATE * (max_frame / FPS)) + 2000 
    audio_buffer = np.zeros((total_samples, 2))
    def generate_wave(note):
        duration_sec = note['length'] * FRAME_TIME
        if duration_sec <= 0: return None
        t = np.linspace(0, duration_sec, int(SAMPLE_RATE * duration_sec), False)
        freq = 440 * (2 ** ((note['pitch'] - 69) / 12))
        vol = note['volume'] / 255.0
        if note['type'] == 0: wave = np.sin(2 * np.pi * freq * t)
        elif note['type'] == 1: wave = 2 * np.abs(2 * (t * freq - np.floor(t * freq + 0.5))) - 1
        elif note['type'] == 2: wave = np.sign(np.sin(2 * np.pi * freq * t))
        elif note['type'] == 3: wave = 2 * (t * freq - np.floor(t * freq + 0.5))
        elif note['type'] == 4:
            wave = np.random.uniform(-1, 1, len(t))
            wave *= np.exp(-np.linspace(0, 5, len(t)))
        else: return None
        fade_len = int(SAMPLE_RATE * 0.005)
        if len(wave) > fade_len * 2:
            wave[:fade_len] *= np.linspace(0, 1, fade_len)
            wave[-fade_len:] *= np.linspace(1, 0, fade_len)
        pan_r = note['pan'] / 255.0
        pan_l = 1.0 - pan_r
        return np.vstack((wave * vol * pan_l, wave * vol * pan_r)).T
    for note in notes:
        wave = generate_wave(note)
        if wave is None: continue
        start_idx = int(note['start'] * FRAME_TIME * SAMPLE_RATE)
        end_idx = start_idx + len(wave)
        audio_buffer[start_idx:end_idx] += wave
    max_val = np.max(np.abs(audio_buffer))
    if max_val > 0: audio_buffer = (audio_buffer / max_val) * 0.9
    audio_int = (audio_buffer * 32767).astype(np.int16)
    audio_segment = AudioSegment(audio_int.tobytes(), frame_rate=SAMPLE_RATE, sample_width=2, channels=2)
    audio_segment.export(output_file, format="mp3")
    print(f"Success: {output_file} ({len(notes)} notes encoded)")
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python mimi2mp3.py yourfile.mimi")
    else:
        mimi_to_mp3(sys.argv[1])