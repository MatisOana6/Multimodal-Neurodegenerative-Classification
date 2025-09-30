import os
import librosa
import soundfile as sf
import numpy as np
import random

input_root = "D:/Licenta/Datasets/Audio/data/Augmented"
output_root = "D:/Licenta/Datasets/Audio/data/Augmented_Output"
os.makedirs(output_root, exist_ok=True)


def add_white_noise(y): return y + 0.01 * np.random.randn(len(y))
def time_shift(y): return np.roll(y, np.random.randint(-5000, 5000))
def pitch_up(y, sr): return librosa.effects.pitch_shift(y, sr=sr, n_steps=2)
def pitch_down(y, sr): return librosa.effects.pitch_shift(y, sr=sr, n_steps=-2)
def volume_up(y): return y * 1.5
def volume_down(y): return y * 0.7

AUGMENTATIONS = {
    "noise": lambda y, sr: add_white_noise(y),
    "shifted": lambda y, sr: time_shift(y),
    "pitch_up": lambda y, sr: pitch_up(y, sr),
    "pitch_down": lambda y, sr: pitch_down(y, sr),
    "vol_up": lambda y, sr: volume_up(y),
    "vol_down": lambda y, sr: volume_down(y),
}

def save_aug(y, sr, cls, original, suffix):
    out_dir = os.path.join(output_root, cls)
    os.makedirs(out_dir, exist_ok=True)
    base = os.path.splitext(original)[0]
    filename = f"{base}_{suffix}.wav"
    sf.write(os.path.join(out_dir, filename), y, sr)

for cls in os.listdir(input_root):
    cls_path = os.path.join(input_root, cls)
    if not os.path.isdir(cls_path):
        continue

    for file in os.listdir(cls_path):
        if not file.endswith(".wav"):
            continue

        filepath = os.path.join(cls_path, file)
        y, sr = librosa.load(filepath, sr=None)

        selected = random.sample(list(AUGMENTATIONS.items()), k=3)

        for aug_name, aug_func in selected:
            try:
                y_aug = aug_func(y, sr)
                save_aug(y_aug, sr, cls, file, aug_name)
            except Exception as e:
                print(f"Eroare augmentare '{aug_name}' pe {file}: {e}")

print("Fiecare fișier a fost augmentat cu exact 3 augmentări aleatoare.")
