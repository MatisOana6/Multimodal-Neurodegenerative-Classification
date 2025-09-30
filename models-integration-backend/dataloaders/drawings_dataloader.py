import os
import torch
from torchvision import datasets, transforms
from torch.utils.data import DataLoader


base_dir = "D:/Licenta/Datasets/Parkinson_s Drawings/augmented_combined/"
test_dir = os.path.join(base_dir, "testing")

img_size = 224
test_transform = transforms.Compose([
    transforms.Resize((img_size, img_size)),
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])
])


drawing_dataset = datasets.ImageFolder(test_dir, transform=test_transform)
drawing_loader = DataLoader(drawing_dataset, batch_size=32, shuffle=False)

drawing_classes = drawing_dataset.classes
