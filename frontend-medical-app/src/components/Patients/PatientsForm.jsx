import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createPatient } from '../../api/PatientApi';
import styles from './PatientPage.module.css';

const PatientsForm = ({ onCreated }) => {
    const [form, setForm] = useState({
        nationalId: '',
        fullName: '',
        dateOfBirth: null,
        gender: '',
        knownConditions: '',
        notes: ''
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createPatient({
                ...form,
                dateOfBirth: form.dateOfBirth?.toISOString().split('T')[0]
            });
            onCreated();
            setForm({
                nationalId: '',
                fullName: '',
                dateOfBirth: null,
                gender: '',
                knownConditions: '',
                notes: ''
            });
        } catch (err) {
            console.error("Error creating patient", err);
        }
    };

    return (
        <div className={styles.formCard}>
            <h3>➕ Add New Patient</h3>
            <form onSubmit={handleSubmit} className={styles.form}>
                <input
                    type="text"
                    name="nationalId"
                    value={form.nationalId}
                    onChange={handleChange}
                    placeholder="CNP / National ID"
                    required
                />

                <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Full Name"
                    required
                />

                <DatePicker
                    selected={form.dateOfBirth}
                    onChange={(date) => setForm({ ...form, dateOfBirth: date })}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select Date of Birth"
                    className={styles.dateInput}
                    maxDate={new Date()}
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={100}
                    showMonthDropdown
                />


                <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                </select>

                <input
                    type="text"
                    name="knownConditions"
                    value={form.knownConditions}
                    onChange={handleChange}
                    placeholder="Known Conditions"
                />

                <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Additional Notes..."
                    rows="3"
                />

                <button type="submit">Save Patient</button>
            </form>
        </div>
    );
};

export default PatientsForm;
