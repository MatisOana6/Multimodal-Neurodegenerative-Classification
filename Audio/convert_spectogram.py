import os
import librosa
import numpy as np

input_root = "D:/Licenta/Datasets/Audio/data/Split_Wav"
output_root = "D:/Licenta/Datasets/Audio/data/MelSpectrograms"

n_mels = 128
target_shape = (128, 128)

def pad_or_crop(mel, target_shape):
    mel = mel[:, :target_shape[1]] if mel.shape[1] >= target_shape[1] else np.pad(
        mel, ((0, 0), (0, target_shape[1] - mel.shape[1])), mode='constant'
    )
    return mel

for split in ['train', 'test']:
    input_dir = os.path.join(input_root, split)
    output_dir = os.path.join(output_root, split)
    os.makedirs(output_dir, exist_ok=True)

    for cls in os.listdir(input_dir):
        cls_path = os.path.join(input_dir, cls)
        if not os.path.isdir(cls_path):
            continue

        output_cls_path = os.path.join(output_dir, cls)
        os.makedirs(output_cls_path, exist_ok=True)

        for file in os.listdir(cls_path):
            if not file.endswith(".wav"):
                continue

            base_name = os.path.splitext(file)[0]
            spec_path = os.path.join(output_cls_path, base_name + ".npy")

            if os.path.exists(spec_path):
                continue  

            file_path = os.path.join(cls_path, file)
            y, sr = librosa.load(file_path, sr=16000)

            mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels)
            mel_db = librosa.power_to_db(mel, ref=np.max)

            mel_db = (mel_db - np.mean(mel_db)) / np.std(mel_db)
            mel_db = pad_or_crop(mel_db, target_shape)

            np.save(spec_path, mel_db)

print("Toate fișierele din Split_Wav/train și test au fost convertite în .npy dacă lipseau.")
