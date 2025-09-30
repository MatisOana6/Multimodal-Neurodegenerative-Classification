import torch
import torchvision.models as models
from torchvision import transforms
from PIL import Image
import matplotlib.pyplot as plt
import numpy as np
import cv2

image_path = "D:/Licenta/Datasets/ADNI_Dataset/ADNI/Processed/Test/AD/AD-2254.png"
model_path = "ResNet_Alzheimer_Multiclass.pth"
class_names = ['AD', 'CN', 'EMCI', 'LMCI', 'MCI'] 

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class ResNetModel(torch.nn.Module):
    def __init__(self, pretrained=True, num_classes=5):
        super(ResNetModel, self).__init__()
        self.resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1 if pretrained else None)
        in_features = self.resnet.fc.in_features
        self.resnet.fc = torch.nn.Sequential(
            torch.nn.Linear(in_features, 512),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.4),
            torch.nn.Linear(512, 256),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.3),
            torch.nn.Linear(256, num_classes)
        )

    def forward(self, x):
        return self.resnet(x)

model = ResNetModel()
model.load_state_dict(torch.load(model_path, map_location=device))
model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize(300),
    transforms.CenterCrop(256),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

img = Image.open(image_path).convert('RGB')
input_tensor = transform(img).unsqueeze(0).to(device)

final_conv = model.resnet.layer4

gradients = []
activations = []

def save_gradient(grad):
    gradients.append(grad)

def forward_hook(module, input, output):
    activations.append(output)
    output.register_hook(save_gradient)

handle = final_conv.register_forward_hook(forward_hook)

output = model(input_tensor)
pred_class = output.argmax(dim=1).item()
print(f"Predicted class: {class_names[pred_class]}")


model.zero_grad()
score = output[0, pred_class]
score.backward()

grads_val = gradients[0][0].detach().cpu().numpy()
acts_val = activations[0][0].detach().cpu().numpy()

weights = np.mean(grads_val, axis=(1, 2))
cam = np.zeros(acts_val.shape[1:], dtype=np.float32)

for i, w in enumerate(weights):
    cam += w * acts_val[i]

cam = np.maximum(cam, 0)
cam = cv2.resize(cam, (256, 256))
cam = cam - np.min(cam)
cam = cam / np.max(cam)

img_cv = np.array(img.resize((256, 256)))
heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
superimposed = np.uint8(0.4 * heatmap + 0.6 * img_cv)

plt.imshow(superimposed)
plt.title(f"Predicted: {class_names[pred_class]}")
plt.axis("off")
plt.show()

handle.remove()
