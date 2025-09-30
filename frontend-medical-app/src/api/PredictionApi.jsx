import axios from "axios";
import { authorizedFetch } from "../auth/AuthorizationFetch.jsx";

const API_BASE = "http://localhost:8080";

export const predictAlzheimer = async (file, modality) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("disease", "alzheimer");
    formData.append("modality", modality);

    const token = localStorage.getItem("token");

    const response = await axios.post(`${API_BASE}/api/ml/predict`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
        }
    });

    return response.data;
};

export const predictParkinson = async (file, modality) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("disease", "parkinson");
    formData.append("modality", modality);

    const token = localStorage.getItem("token");

    const response = await axios.post(`${API_BASE}/api/ml/predict`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
        }
    });

    return response.data;
};

export const predictEnsemble = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");

    const response = await axios.post(`http://localhost:8080/api/ml/predict-ensemble`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
        }
    });

    return response.data;
};


export const savePrediction = async (data, subtype, confidence) => {
    return authorizedFetch(
        `http://localhost:8080/api/predictions?subtype=${subtype}&confidence=${confidence}`,
        {
            method: 'POST',
            body: JSON.stringify(data)
        }
    );
};

export const getCamStatus = async (predictionId) => {
    const token = localStorage.getItem("token");

    const response = await axios.get(`http://localhost:8080/api/ml/cam-status/${predictionId}`, {
        headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
        }
    });

    return response.data;
};

