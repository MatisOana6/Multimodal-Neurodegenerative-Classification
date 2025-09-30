import styles from './FeaturesSection.module.css';
import { FaMicroscope, FaBrain, FaStethoscope } from 'react-icons/fa';

const FeaturesSection = () => {
    return (
        <section className={styles.featuresSection}>
            <h2>Why Choose NeuroPredict?</h2>
            <div className={styles.featuresGrid}>
                <div className={styles.featureCard}>
                    <FaBrain className={styles.icon} />
                    <h3>Multimodal AI</h3>
                    <p>Combines MRI, audio, and drawings for more accurate diagnosis of Alzheimer's and Parkinson's.</p>
                </div>
                <div className={styles.featureCard}>
                    <FaMicroscope className={styles.icon} />
                    <h3>Research-Grade Models</h3>
                    <p>Built with advanced deep learning architectures optimized for neurodegenerative detection.</p>
                </div>
                <div className={styles.featureCard}>
                    <FaStethoscope className={styles.icon} />
                    <h3>Made for Professionals</h3>
                    <p>Designed for neurologists, radiologists and researchers to support clinical workflows.</p>
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
