const API_BASE = 'http://localhost:8080';

export const loginUser = async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Invalid credentials');

    const data = await response.json();

    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);

    return data;
};


export const registerUser = async (formData) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Registration failed');
    }

    return await response.text();
};

