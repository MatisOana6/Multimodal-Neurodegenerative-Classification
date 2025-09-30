import torch
from PIL import Image

def predict_image_with_model(model, image_path, class_names, device="cpu", transform=None):
    model.eval()
    image = Image.open(image_path).convert("RGB")
    input_tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(input_tensor)
        probs = torch.nn.functional.softmax(output, dim=1)[0]
        pred_idx = torch.argmax(probs).item()

    return {
        "predicted_class": class_names[pred_idx],
        "probabilities": {class_names[i]: float(probs[i]) for i in range(len(class_names))}
    }
