from torchvision import datasets
from torch.utils.data import DataLoader

from transforms.transforms import transform_axial, transform_sagittal, transform_parkinson

axial_loader = DataLoader(
    datasets.ImageFolder("D:/Licenta/Datasets/ADNI_Oficial/Processed/Axial/Test", transform=transform_axial),
    batch_size=32,
    shuffle=False
)

sagittal_loader = DataLoader(
    datasets.ImageFolder("D:/Licenta/Datasets/ADNI_Oficial/Filtered/Sagittal/Test", transform=transform_sagittal),
    batch_size=32,
    shuffle=False
)

parkinson_loader = DataLoader(
    datasets.ImageFolder("D:/Licenta/Datasets/PPMI_Oficial/Augmented/Test", transform=transform_parkinson),
    batch_size=32,
    shuffle=False
)
