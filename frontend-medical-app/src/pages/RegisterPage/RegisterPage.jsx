import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from "../../api/AuthApi.jsx";
import styles from './RegisterPage.module.css';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        institution: '',
        specialization: '',
        role: 'USER',
        medicalRole: '',
        customSpecialization: ''
    });

    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [successMessage, setSuccessMessage] = useState('');

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.fullName.trim()) {
            setError("Please enter your full name.");
            return;
        }

        if (!validateEmail(formData.email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (!formData.specialization) {
            setError("Please select a specialization.");
            return;
        }

        if (formData.specialization === 'Other' && !formData.customSpecialization.trim()) {
            setError("Please enter your specialization.");
            return;
        }

        if (!formData.medicalRole) {
            setError("Please select a medical role.");
            return;
        }

        if (!agreeTerms) {
            setError("You must agree to the Terms and Conditions.");
            return;
        }

        const finalData = {
            ...formData,
            agreedTerms: agreeTerms,
            specialization: formData.specialization === 'Other'
                ? formData.customSpecialization
                : formData.specialization
        };

        try {
            await registerUser(finalData);
            setSuccessMessage("Registration successful! Redirecting to login...");
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setError(err.message || "Registration failed.");
        }
    };

    return (
        <div className={styles.registerWrapper}>
            <div className={styles.registerContainer}>
                <h2>Create your account</h2>
                <p className={styles.subtitle}>Join NeuroPredict and start detecting with AI</p>

                <form onSubmit={handleRegister} className={styles.form}>
                    <input
                        name="fullName"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className={styles.input}
                    />

                    <input
                        name="email"
                        placeholder="Email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={styles.input}
                    />

                    <input
                        name="password"
                        placeholder="Password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className={styles.input}
                    />

                    <input
                        name="institution"
                        placeholder="Institution"
                        value={formData.institution}
                        onChange={handleChange}
                        className={styles.input}
                    />

                    <select
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        className={styles.select}
                        required
                    >
                        <option value="" disabled>Select specialization</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Geriatrics">Geriatrics</option>
                        <option value="Neurosurgery">Neurosurgery</option>
                        <option value="Psychiatry">Psychiatry</option>
                        <option value="Radiology">Radiology</option>
                        <option value="Neuropsychology">Neuropsychology</option>
                        <option value="Internal Medicine">Internal Medicine</option>
                        <option value="Cognitive Neuroscience">Cognitive Neuroscience</option>
                        <option value="Clinical Research">Clinical Research</option>
                        <option value="Speech and Language Therapy">Speech and Language Therapy</option>
                        <option value="Other">Other</option>
                    </select>

                    {formData.specialization === 'Other' && (
                        <input
                            name="customSpecialization"
                            placeholder="Enter your specialization"
                            value={formData.customSpecialization}
                            onChange={(e) =>
                                setFormData({ ...formData, customSpecialization: e.target.value })
                            }
                            className={styles.input}
                            required
                        />
                    )}

                    <select
                        name="medicalRole"
                        value={formData.medicalRole}
                        onChange={handleChange}
                        className={styles.select}
                        required
                    >
                        <option value="" disabled>Select Medical Role</option>
                        <option value="GENERAL_PRACTITIONER">General Practitioner</option>
                        <option value="NEUROLOGIST">Neurologist</option>
                        <option value="RADIOLOGIST">Radiologist</option>
                        <option value="RESEARCH_PHYSICIAN">Research Physician</option>
                    </select>

                    <div className={styles.termsWrapper}>
                        <input
                            type="checkbox"
                            id="terms"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                        />
                        <label htmlFor="terms">
                            I agree to the <span className={styles.termsLink} onClick={() => setShowModal(true)}>Terms and Conditions</span>
                        </label>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                    {successMessage && <p className={styles.success}>{successMessage}</p>}

                    <button type="submit" className={styles.button}>Register</button>
                </form>

                <p className={styles.loginPrompt}>
                    Already have an account?{" "}
                    <Link to="/login" className={styles.loginLink}>Log in</Link>
                </p>
            </div>

            {/* Modal */}
            {showModal && (
                <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3>Terms and Conditions</h3>
                        <p><strong>Terms and Conditions of Use</strong></p>
                        <p>
                            By registering and using the NeuroPredict platform, you confirm that you are a qualified medical professional or researcher and agree to use the system responsibly and in accordance with ethical standards and legal regulations.
                        </p>
                        <p>
                            <strong>1. Medical Disclaimer:</strong><br />
                            NeuroPredict is intended as a support tool for aiding in the diagnosis and monitoring of neurodegenerative diseases such as Alzheimer's and Parkinson's. It is not a substitute for clinical judgment.
                        </p>
                        <p>
                            <strong>2. Data Responsibility:</strong><br />
                            Ensure uploaded data complies with GDPR or national privacy laws. No identifiable patient data is stored.
                        </p>
                        <p>
                            <strong>3. Usage:</strong><br />
                            Only authorized medical professionals may use the platform. Reverse engineering or misuse is prohibited.
                        </p>
                        <p>
                            <strong>4. Liability:</strong><br />
                            NeuroPredict is not liable for clinical decisions. Use is at your own discretion.
                        </p>
                        <p>
                            <strong>5. IP Rights:</strong><br />
                            All platform components belong to NeuroPredict.
                        </p>
                        <p>
                            <strong>6. Changes:</strong><br />
                            Continued use after updates implies agreement with new terms.
                        </p>
                        <p>
                            By checking the box and registering, you confirm that you have read, understood, and agreed to these terms.
                        </p>
                        <button onClick={() => setShowModal(false)} className={styles.modalClose}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisterPage;
