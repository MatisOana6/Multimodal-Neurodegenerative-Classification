import React from 'react';
import styles from './HomePage.module.css';
import {Link, useNavigate} from 'react-router-dom';
import Navbar from "../../components/NavBar/NavBar.jsx";
import FeaturesSection from "../../components/FeaturesSection/FeaturesSection.jsx";
import HowItWorks from "../../components/HowItWorks/HowItWorks.jsx";
import TestimonialSection from "../../components/TestimonialSection/TestimonialSection.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import { Brain, Activity, HelpCircle, UserPlus, BarChart3, Stethoscope } from "lucide-react";


const HomePage = () => {
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    return (
        <div className={styles.homepageContainer}>
            <video autoPlay loop muted playsInline className={styles.videoBackground}>
                <source src="/49809-458438857.mp4" type="video/mp4" />
            </video>
            <div className={styles.videoOverlay}></div>
            <div className={styles.contentWrapper}>
                <section className={styles.heroSection}>
                    <div className={styles.heroSpacer}></div>
                    <div className={styles.heroText}>
                        <h1>AI-Powered Neurodegenerative Disease Detection</h1>
                        <p>
                            NeuroPredict helps clinicians and researchers detect early signs of Alzheimer and Parkinson
                            using MRI, audio recordings, and patient drawings.
                        </p>
                        <div className={styles.buttonRow}>
                            <button className={styles.ctaButton} onClick={() => navigate(token ? "/predict" : "/register")}>
                                <Stethoscope size={20} /> Start Diagnosis
                            </button>
                            <button className={styles.ctaButton} onClick={() => navigate("/patients")}>
                                <UserPlus size={20} /> Medical Records
                            </button>
                            <button className={styles.ctaButton} onClick={() => navigate("/dashboard")}>
                                <BarChart3 size={20} /> Statistics
                            </button>
                        </div>
                    </div>
                </section>
                <FeaturesSection />
                <HowItWorks />
                <TestimonialSection />
                <Footer />
            </div>
        </div>
    );
};

export default HomePage;
