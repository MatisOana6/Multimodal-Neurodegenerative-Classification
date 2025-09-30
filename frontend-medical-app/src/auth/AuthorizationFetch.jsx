export const authorizedFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Missing token");

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Request failed`);
    }

    return await response.json();
};
