import axios from 'axios';
import {authorizedFetch} from "../auth/AuthorizationFetch.jsx";

const BASE_URL = 'http://localhost:8080/patients';

export const getAllPatients = () => {
    return authorizedFetch('http://localhost:8080/patients');
};

export const createPatient = (patientData) => {
    return authorizedFetch('http://localhost:8080/patients', {
        method: 'POST',
        body: JSON.stringify(patientData)
    });
};


export const getPatientById = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch patient by ID:', error);
        throw error;
    }
};

export const updatePatient = async (id, updatedData) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(`${BASE_URL}/${id}`, updatedData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to update patient:', error);
        throw error;
    }
};


export const deletePatient = async (id) => {
    try {
        const response = await axios.delete(`${BASE_URL}/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete patient:', error);
        throw error;
    }
};
