import cv2
import numpy as np

def overlay_brain_regions(input_path, output_path):
    img = cv2.imread(input_path)
    img = cv2.resize(img, (256, 256))  
    h, w, _ = img.shape
    overlay = img.copy()

    brain_regions = [
       
        ("Frontal Lobe", (int(w * 0.5), int(h * 0.30)), (50, 25), (160, 100, 200), (-80, -10), (255, 255, 255)),
        ("Parietal Lobe", (int(w * 0.5), int(h * 0.45)), (55, 27), (80, 200, 120), (-85, 0), (255, 255, 255)),
        ("Temporal Lobe", (int(w * 0.38), int(h * 0.60)), (50, 25), (255, 180, 50), (-90, 0), (0, 0, 0)),
        ("Hippocampus", (int(w * 0.52), int(h * 0.63)), (35, 18), (120, 70, 210), (20, 0), (255, 255, 255)),
        ("Occipital Lobe", (int(w * 0.5), int(h * 0.76)), (50, 25), (200, 100, 160), (-70, 0), (255, 255, 255)),
    ]

    for name, center, axes, fill_color, text_offset, text_color in brain_regions:
        cv2.ellipse(overlay, center, axes, 0, 0, 360, fill_color, -1)
        cv2.ellipse(overlay, center, axes, 0, 0, 360, (255, 255, 255), 1)

        text_x = center[0] + text_offset[0]
        text_y = center[1] + text_offset[1]
        cv2.putText(overlay, name, (text_x, text_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, text_color, 1, cv2.LINE_AA)

    alpha = 0.35
    result = cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0)
    cv2.imwrite(output_path, result)
