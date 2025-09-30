import os
import shutil
import random

input_dir = "D:\Licenta\Datasets\Audio\data\Processed_Wav"  
output_dir = "D:/Licenta/Datasets/Audio/data/Split_Wav"
train_ratio = 0.8  

random.seed(42)

for split in ['train', 'test']:
    for cls in os.listdir(input_dir):
        os.makedirs(os.path.join(output_dir, split, cls), exist_ok=True)


for cls in os.listdir(input_dir):
    cls_path = os.path.join(input_dir, cls)
    if not os.path.isdir(cls_path):
        continue

    files = [f for f in os.listdir(cls_path) if f.endswith(('.wav', '.npy'))]
    random.shuffle(files)

    split_index = int(len(files) * train_ratio)
    train_files = files[:split_index]
    test_files = files[split_index:]

    for f in train_files:
        src = os.path.join(cls_path, f)
        dst = os.path.join(output_dir, 'train', cls, f)
        shutil.copyfile(src, dst)

    for f in test_files:
        src = os.path.join(cls_path, f)
        dst = os.path.join(output_dir, 'test', cls, f)
        shutil.copyfile(src, dst)

print("Fișierele au fost împărțite în `train` și `test`, structura a fost păstrată.")
