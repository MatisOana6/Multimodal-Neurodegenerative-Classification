from torchvision import transforms

def get_transform_for(disease: str, modality: str):
    if disease == "alzheimer":
        if modality == "mri_axial":
            mean = [0.2006] * 3
            std = [0.2396] * 3
        elif modality == "mri_sagittal":
            mean = [0.2487] * 3
            std = [0.2599] * 3
        else:
            mean = [0.2006] * 3
            std = [0.2396] * 3
    elif disease == "parkinson":
        mean = [0.2514] * 3
        std = [0.2475] * 3
    else:
        mean = [0.5] * 3
        std = [0.5] * 3

    return transforms.Compose([
        transforms.Grayscale(num_output_channels=3),
        transforms.Resize((256, 256)),
        transforms.ToTensor(),
        transforms.Normalize(mean, std)
    ])
