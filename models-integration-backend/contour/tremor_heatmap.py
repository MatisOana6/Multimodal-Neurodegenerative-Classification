import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
from scipy.ndimage import mean as ndi_mean
from skimage import feature, measure

def analyze_drawing_quality(image_path, output_prefix, prediction_id=None):
    os.makedirs(os.path.dirname(output_prefix), exist_ok=True)

    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    img_blur = cv2.medianBlur(img, 3)

    _, binary = cv2.threshold(img_blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = binary > 0
    stroke_pixels = img_blur[mask]

    stroke_mean = np.mean(stroke_pixels)
    stroke_std = np.std(stroke_pixels)
    local_contrast = np.std(img_blur)
    entropy = measure.shannon_entropy(binary)
    glcm = feature.graycomatrix(binary, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)
    glcm_contrast = feature.graycoprops(glcm, 'contrast')[0, 0]

    f = np.fft.fft2(img_blur)
    fshift = np.fft.fftshift(f)
    rows, cols = img.shape
    crow, ccol = rows // 2, cols // 2

    r_min = int(0.02 * crow)
    r_max = int(0.1 * crow)
    mask_band = np.zeros((rows, cols), np.uint8)
    Y, X = np.ogrid[:rows, :cols]
    distance = np.sqrt((Y - crow)**2 + (X - ccol)**2)
    mask_band[(distance >= r_min) & (distance <= r_max)] = 1

    fshift_band = fshift * mask_band
    img_tremor = np.abs(np.fft.ifft2(np.fft.ifftshift(fshift_band)))
    tremor_norm = cv2.normalize(img_tremor, None, 0, 1, cv2.NORM_MINMAX)

    blurred = cv2.GaussianBlur(tremor_norm, (45, 45), 0)
    blurred_norm = cv2.normalize(blurred, None, 0, 1, cv2.NORM_MINMAX)
    heatmap = cv2.applyColorMap((blurred_norm * 255).astype(np.uint8), cv2.COLORMAP_JET)
    img_bgr = cv2.cvtColor(img_blur, cv2.COLOR_GRAY2BGR)
    overlay = cv2.addWeighted(img_bgr, 0.7, heatmap, 0.3, 0)

    plt.figure(figsize=(6, 6))
    plt.imshow(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
    plt.title("Tremor Heatmap")
    plt.axis('off')
    plt.savefig(f"{output_prefix}_tremor_camstyle.png", bbox_inches='tight', dpi=200)
    plt.close()

    magnitude_spectrum = np.log1p(np.abs(fshift))
    crop_size = rows // 4
    center = (rows // 2, cols // 2)
    fft_cropped = magnitude_spectrum[
        center[0] - crop_size:center[0] + crop_size,
        center[1] - crop_size:center[1] + crop_size
    ]
    Yc, Xc = np.indices(fft_cropped.shape)
    R = np.sqrt((Xc - crop_size)**2 + (Yc - crop_size)**2)
    r = np.arange(0, crop_size)
    radial_mean = ndi_mean(fft_cropped, labels=np.round(R).astype(int), index=r)

    plt.figure(figsize=(6, 6))
    plt.imshow(fft_cropped, cmap='viridis', extent=[-crop_size, crop_size, -crop_size, crop_size])
    plt.title("FFT Spectrum")
    plt.colorbar(label="Log Power")
    plt.savefig(f"{output_prefix}_fft.png", bbox_inches='tight', dpi=200)
    plt.close()

    plt.figure(figsize=(6, 4))
    plt.plot(r, radial_mean)
    plt.title("Radial Power Profile (FFT)")
    plt.xlabel("Radius [px]")
    plt.ylabel("Mean Log Power")
    plt.grid(True)
    plt.savefig(f"{output_prefix}_fft_radial.png", bbox_inches='tight', dpi=200)
    plt.close()

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    all_points = np.vstack([c.squeeze() for c in contours])
    filename = os.path.basename(image_path).lower()
    if filename.startswith("wave"):
        shape_type = "wave"
    elif filename.startswith("spiral"):
        shape_type = "spiral"
    else:
        rx, ry = np.ptp(all_points[:, 0]), np.ptp(all_points[:, 1])
        shape_type = "wave" if rx / (ry + 1e-5) > 2 else "spiral"

    band = (r > 10)
    high_freq_power = np.sum(radial_mean[band]) / np.sum(radial_mean)

    metrics = {
        "stroke_mean": round(float(stroke_mean), 4),
        "stroke_std": round(float(stroke_std), 4),
        "local_contrast": round(float(local_contrast), 4),
        "entropy": round(float(entropy), 4),
        "glcm_contrast": round(float(glcm_contrast), 4),
        "high_freq_power": round(float(high_freq_power), 4)
    }


    return {
        "prediction_id": prediction_id,
        "metrics": metrics,
        "fft_url": f"{output_prefix}_fft.png",
        "fft_radial_url": f"{output_prefix}_fft_radial.png",
        "tremor_overlay_url": f"{output_prefix}_tremor_camstyle.png",
        "shape_type": shape_type,
        "description": "Pixel-level metrics + soft Grad-CAM-like tremor overlay"
    }
