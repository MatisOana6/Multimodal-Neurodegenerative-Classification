import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PredictionPage.module.css";
import { Brain, Activity, HelpCircle, Mic } from "lucide-react";

const PredictionPage = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.pageLayout}>
            <div className={styles.sideVideo}>
                <video autoPlay loop muted preload="auto" className={styles.video}>
                    <source src="/206173.mp4" type="video/mp4" />
                </video>
            </div>

            <div className={styles.mainContent}>
                <h1 className={styles.title}>NeuroPredict: Intelligent Diagnosis</h1>
                <p className={styles.subtitle}>
                    Choose a prediction card based on your patient's symptoms or test results.
                </p>

                <div className={styles.cards}>
                    <div className={styles.card} onClick={() => navigate("/predict/alzheimer")}>
                        <Brain className={styles.icon} />
                        <h3>Alzheimer</h3>
                        <p>Upload MRI scans to detect Alzheimer’s disease.</p>
                    </div>

                    <div className={styles.card} onClick={() => navigate("/predict/parkinson")}>
                        <Activity className={styles.icon} />
                        <h3>Parkinson</h3>
                        <p>Detect Parkinson’s using MRI or handwriting samples.</p>
                    </div>

                    <div className={styles.card} onClick={() => navigate("/predict/audio")}>
                        <Mic className={styles.icon} />
                        <h3>Audio-Based</h3>
                        <p>Use voice recordings to identify signs of Alzheimer or Parkinson.</p>
                    </div>

                    <div className={styles.card} onClick={() => navigate("/predict/ensemble")}>
                        <HelpCircle className={styles.icon} />
                        <h3>Not Sure?</h3>
                        <p>Let the ensemble model choose between Alzheimer and Parkinson.</p>
                    </div>
                </div>
            </div>

            <div className={styles.sideVideo}>
                <video autoPlay loop muted preload="auto" className={styles.video}>
                    <source src="/206173.mp4" type="video/mp4" />
                </video>
            </div>
        </div>
    );
};

export default PredictionPage;
