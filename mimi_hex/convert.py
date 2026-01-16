# numpyとpydubとtqdmとffmpegいります
import numpy as np
from pydub import AudioSegment
from tqdm import tqdm
import os
import sys

base_path = r"C:\Users\Aruiha\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"
# すいませんね配布のこと考えてなくて！！！！！！！！なぜかffmpeg動かなかったから許して！！！！！！！
AudioSegment.converter = os.path.join(base_path, "ffmpeg.exe")
AudioSegment.ffprobe   = os.path.join(base_path, "ffprobe.exe")

def fast_mp3_to_mimi_hex(input_file, sample_rate=8000):
    print(f"Loading {input_file} ...")
    audio = AudioSegment.from_file(input_file)
    audio = audio.set_channels(1).set_frame_rate(sample_rate)
    
    print("Converting to array...")
    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    
    s_min, s_max = samples.min(), samples.max()
    if s_max == s_min:
        return "0" * len(samples)
    
    normalized = (samples - s_min) / (s_max - s_min)
    indices = np.clip((normalized * 15).astype(np.int8), 0, 15)
    
    hex_lookup = np.array(list("0123456789ABCDEF"), dtype='U1')
    
    print(f"Generating Mimi-Code (Length: {len(indices)} samples)...")
    
    chunk_size = 100000
    mimi_chunks = []
    
    for i in tqdm(range(0, len(indices), chunk_size), desc="Converting"):
        chunk = indices[i : i + chunk_size]
        mimi_chunks.append("".join(hex_lookup[chunk]))
    
    return "".join(mimi_chunks)

input_mp3 = "input.mp3"
output_txt = "music_score.txt"

if not os.path.exists(input_mp3):
    print(f"Error: {input_mp3} が見つかりません！")
    sys.exit()

try:
    full_hex = fast_mp3_to_mimi_hex(input_mp3)
    
    print(f"\nSuccess! Writing to {output_txt}...")
    with open(output_txt, "w") as f:
        f.write(full_hex)
    
    print(f"Done! Total length: {len(full_hex)} chars.")
    print(f"File size: {os.path.getsize(output_txt) / 1024 / 1024:.2f} MB")

except Exception as e:
    print(f"\nError: {e}")