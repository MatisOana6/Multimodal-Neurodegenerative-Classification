import os
import librosa
import soundfile as sf
import numpy as np

input_dir = "D:/Licenta/Datasets/Audio/data/Augmented_Output"
output_dir = "D:/Licenta/Datasets/Audio/data/Processed_Wav"
target_sr = 16000
segment_len = 160000  

os.makedirs(output_dir, exist_ok=True)

def has_voice(y, sr, threshold_energy=0.01, min_voiced_ratio=0.1):
    frame_length = 2048
    hop_length = 512
    energy = np.array([
        np.sum(np.abs(y[i:i + frame_length] ** 2))
        for i in range(0, len(y) - frame_length, hop_length)
    ])
    voiced_frames = np.sum(energy > threshold_energy)
    voiced_ratio = voiced_frames / len(energy)
    return voiced_ratio > min_voiced_ratio

for cls in os.listdir(input_dir):
    cls_path = os.path.join(input_dir, cls)
    if not os.path.isdir(cls_path):
        continue

    output_cls_path = os.path.join(output_dir, cls)
    os.makedirs(output_cls_path, exist_ok=True)

    for file in os.listdir(cls_path):
        if not file.endswith(".wav"):
            continue

        file_path = os.path.join(cls_path, file)
        y, sr = librosa.load(file_path, sr=target_sr)
        y = y / np.max(np.abs(y)) 

        total_len = len(y)
        num_segments = (total_len + segment_len - 1) // segment_len

        for i in range(num_segments):
            start = i * segment_len
            end = min((i + 1) * segment_len, total_len)
            segment = y[start:end]

            if len(segment) < segment_len:
                segment = np.pad(segment, (0, segment_len - len(segment)))

            if has_voice(segment, sr):
                base = os.path.splitext(file)[0]
                segment_name = f"{base}_part{i + 1}.wav"
                segment_path = os.path.join(output_cls_path, segment_name)
                sf.write(segment_path, segment, target_sr)
            else:
                print(f"Segmentul {file} part {i + 1} ignorat (fără voce)")

print("Segmentare finalizată cu detectare voce (fără compilare).")
