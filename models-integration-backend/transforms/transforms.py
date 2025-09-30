from torchvision import transforms

transform_axial = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize([0.2006]*3, [0.2396]*3)
])

transform_sagittal = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize([0.2487]*3, [0.2599]*3)
])

transform_parkinson = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize([0.2514]*3, [0.2475]*3)
])
