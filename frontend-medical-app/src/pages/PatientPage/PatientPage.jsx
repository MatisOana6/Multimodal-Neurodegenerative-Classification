import React, { useState, useEffect } from 'react';
import { getAllPatients, getPatientById } from '../../api/PatientApi';
import styles from './PatientPage.module.css';
import PatientForm from "../../components/Patients/PatientsForm.jsx";
import PatientDetails from "../../components/Patients/PatientDetails.jsx";

const PatientPage = () => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        const data = await getAllPatients();
        setPatients(data);
    };

    const handlePatientCreated = async () => {
        await fetchPatients();
        setShowModal(false);
    };

    const clearSearch = () => setSearchTerm('');

    const handleSelectPatient = async (id) => {
        const fullPatient = await getPatientById(id);
        setSelectedPatient({ ...fullPatient, startInEditMode: false });
    };

    const handleEditPatient = async (id) => {
        const fullPatient = await getPatientById(id);
        setSelectedPatient({ ...fullPatient, startInEditMode: true });
    };

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <h3 className={styles.sidebarTitle}>Patients</h3>

                <div className={styles.searchWrapper}>
                    <input
                        type="text"
                        placeholder="Search by name, ID, or CNP..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className={styles.clearBtn} onClick={clearSearch}>✖</button>
                    )}
                </div>
                <button className={styles.addBtn} onClick={() => setShowModal(true)}>
                    ➕ Add Patient
                </button>
                <ul className={styles.patientList}>
                    {patients
                        .filter((p) =>
                            p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.nationalId?.includes(searchTerm)
                        )
                        .sort((a, b) => (a.identifier || '').localeCompare(b.identifier || ''))
                        .map((p) => (
                            <li
                                key={p.id}
                                className={selectedPatient?.id === p.id ? styles.active : ''}
                                onClick={() => handleSelectPatient(p.id)}
                            >
                                <div className={styles.patientItemRow}>
                                    <div className={styles.patientInfo}>
                                        <p className={styles.patientId}>{p.identifier}</p>
                                        <p className={styles.patientName}>{p.fullName}</p>
                                    </div>

                                    <button
                                        className={styles.editBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditPatient(p.id);
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            </li>


                        ))}
                </ul>


            </div>

            <div className={styles.details}>
                {selectedPatient ? (
                    <PatientDetails patient={selectedPatient} />
                ) : (
                    <div className={styles.placeholder}>Select a patient to view details.</div>
                )}
            </div>

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✖</button>
                        <PatientForm onCreated={handlePatientCreated} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientPage;
