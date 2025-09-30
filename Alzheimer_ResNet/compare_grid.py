import os
import cv2
import matplotlib.pyplot as plt
import random

original_dir = "D:/Licenta/Datasets/ADNI_Oficial/Converted/AD"
filtered_dir = "D:/Licenta/Datasets/ADNI_Oficial/Processed/AD"
num_images = 9  

common_files = list(set(os.listdir(original_dir)) & set(os.listdir(filtered_dir)))
common_files = [f for f in common_files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
sampled = random.sample(common_files, min(num_images, len(common_files)))

rows = int(num_images ** 0.5)
cols = rows
fig, axes = plt.subplots(2, len(sampled), figsize=(15, 5))

for i, fname in enumerate(sampled):
    orig_path = os.path.join(original_dir, fname)
    filt_path = os.path.join(filtered_dir, fname)

    orig_img = cv2.imread(orig_path, cv2.IMREAD_GRAYSCALE)
    filt_img = cv2.imread(filt_path, cv2.IMREAD_GRAYSCALE)

    axes[0, i].imshow(orig_img, cmap='gray')
    axes[0, i].set_title("Original")
    axes[0, i].axis('off')

    axes[1, i].imshow(filt_img, cmap='gray')
    axes[1, i].set_title("Filtrat")
    axes[1, i].axis('off')

plt.suptitle("Comparație imagini: Original vs. Filtrat", fontsize=16)
plt.tight_layout()
plt.show()
