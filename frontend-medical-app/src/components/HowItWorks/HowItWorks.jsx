import styles from './HowItWorks.module.css';

const HowItWorks = () => {
    return (
        <section className={styles.howSection}>
            <h2>How It Works</h2>
            <div className={styles.stepsGrid}>
                <div className={styles.step}>
                    <span className={styles.stepNumber}>1</span>
                    <h3>Upload Data</h3>
                    <p>Upload patient MRI scans, voice samples, or drawing data securely through the platform.</p>
                </div>
                <div className={styles.step}>
                    <span className={styles.stepNumber}>2</span>
                    <h3>Run AI Prediction</h3>
                    <p>Our AI models analyze the inputs to detect early signs of Alzheimer’s or Parkinson’s disease.</p>
                </div>
                <div className={styles.step}>
                    <span className={styles.stepNumber}>3</span>
                    <h3>View Results</h3>
                    <p>Explore structured, easy-to-understand predictions and access patient history instantly.</p>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
