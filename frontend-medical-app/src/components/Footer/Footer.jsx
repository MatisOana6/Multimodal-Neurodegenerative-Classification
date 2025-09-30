import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <p>&copy; {new Date().getFullYear()} NeuroPredict. Empowering early diagnosis through AI.</p>
        </footer>
    );
};

export default Footer;
