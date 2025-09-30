import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <header className={styles.navbar}>
            <div className={styles.navbarContainer}>
                <Link to="/" className={styles.logo}>NeuroPredict</Link>
                <nav className={styles.navLinks}>
                    {!token ? (
                        <>
                            <Link to="/register" className={styles.navLink}>Register</Link>
                            <Link to="/login" className={styles.navLink}>Login</Link>
                        </>
                    ) : (
                        <>
                            <span className={styles.userLabel}>{user.fullName}</span>
                            <Link to="/predict" className={styles.navLink}>Predict</Link>
                            <Link to="/patients" className={styles.navLink}>Patients</Link>
                            <Link
                                to="/"
                                onClick={logout}
                                className={styles.navLink}
                            >
                                Logout
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
