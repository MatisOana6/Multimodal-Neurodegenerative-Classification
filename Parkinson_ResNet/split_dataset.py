import os
import shutil
import random

original_data_dir = 'D:\Licenta\Datasets\PPMI_Oficial\Augmented'
train_dir = os.path.join(original_data_dir, 'Train')
test_dir = os.path.join(original_data_dir, 'Test')
train_ratio = 0.8  

os.makedirs(train_dir, exist_ok=True)
os.makedirs(test_dir, exist_ok=True)

for class_name in os.listdir(original_data_dir):
    class_path = os.path.join(original_data_dir, class_name)
    if not os.path.isdir(class_path):
        continue
    if class_name in ['Train', 'Test']:  
        continue

    images = [f for f in os.listdir(class_path) if os.path.isfile(os.path.join(class_path, f))]
    random.shuffle(images)

    train_count = int(train_ratio * len(images))
    train_images = images[:train_count]
    test_images = images[train_count:]

    train_class_dir = os.path.join(train_dir, class_name)
    test_class_dir = os.path.join(test_dir, class_name)
    os.makedirs(train_class_dir, exist_ok=True)
    os.makedirs(test_class_dir, exist_ok=True)

    
    for img in train_images:
        shutil.copy2(os.path.join(class_path, img), os.path.join(train_class_dir, img))

    for img in test_images:
        shutil.copy2(os.path.join(class_path, img), os.path.join(test_class_dir, img))

    print(f"{class_name}: {len(train_images)} train, {len(test_images)} test")

print("\n Done! Images have been successfully split and copied into the Train/ and Test/ folders.")

