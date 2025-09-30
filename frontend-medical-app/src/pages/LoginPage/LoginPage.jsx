import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from "../../api/AuthApi.jsx";
import styles from './LoginPage.module.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        try {
            const data = await loginUser(email, password);

            switch (data.role) {
                case 'ADMIN':
                    navigate('/admin');
                    break;
                case 'USER':
                default:
                    navigate('/predict');
            }
        } catch (err) {
            setError(err.message || "Login failed.");
        }
    };


    return (
        <div className={styles.loginWrapper}>
            <div className={styles.loginContainer}>
                <h2>Welcome back!</h2>
                <p className={styles.subtitle}>Please log in to your NeuroPredict account</p>

                <form onSubmit={handleLogin} className={styles.form}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        required
                    />

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" className={styles.button}>Login</button>
                </form>

                <p className={styles.registerPrompt}>
                    Don't have an account?{' '}
                    <Link to="/register" className={styles.registerLink}>Register</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
