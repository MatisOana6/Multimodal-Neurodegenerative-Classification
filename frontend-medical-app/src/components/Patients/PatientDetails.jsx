import React, {useEffect, useState} from 'react';
import styles from './PatientDetails.module.css';
import PatientStats from './PatientStats';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from "jspdf-autotable";
import Chart from 'chart.js/auto';
import Swal from 'sweetalert2';
import { UserRound, Stethoscope } from 'lucide-react';
import {updatePatient} from "../../api/PatientApi.jsx";
const PatientDetails = ({ patient }) => {
    const [currentPatient, setCurrentPatient] = useState(patient);
    const {
        identifier,
        nationalId,
        fullName,
        dateOfBirth,
        gender,
        notes,
        knownConditions,
        predictions = []
    } = currentPatient;
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('');
    const { startInEditMode = false } = patient;
    const [isEditing, setIsEditing] = useState(startInEditMode);

    useEffect(() => {
        setIsEditing(startInEditMode);
    }, [startInEditMode]);

    
    const [editedPatient, setEditedPatient] = useState({
        id: patient.id,
        identifier: patient.identifier,
        fullName: patient.fullName,
        nationalId: patient.nationalId,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth,
        knownConditions: patient.knownConditions,
        notes: patient.notes
    });


    useEffect(() => {
        setEditedPatient({
            id: patient.id,
            identifier: patient.identifier,
            fullName: patient.fullName,
            nationalId: patient.nationalId,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            knownConditions: patient.knownConditions,
            notes: patient.notes
        });
    }, [patient]);

    useEffect(() => {
        setEditedPatient({ ...patient });
        setCurrentPatient(patient);
    }, [patient]);

    const [showStats, setShowStats] = useState(false);
    const [showAllPredictions, setShowAllPredictions] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => {
                setStatusMessage('');
                setStatusType('');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const handleUpdatePatient = async () => {
        try {
            await updatePatient(patient.id, editedPatient);
            setCurrentPatient(editedPatient);
            setStatusMessage("Patient updated successfully!");
            setStatusType("success");
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            setStatusMessage("Failed to update patient.");
            setStatusType("error");
        }
    };

    const getCorrectDisease = (pred) => {
        if (pred.modality === 'audio') {
            if (pred.subtype.toLowerCase() === 'parkinson') return 'parkinson';
            if (pred.subtype.toLowerCase() === 'healthy') return 'healthy';
            return 'unknown';
        }
        if (pred.modality === 'drawing') return 'parkinson';
        if (['mri_axial', 'mri_sagittal', 'ensemble'].includes(pred.modality)) return 'alzheimer';
        return pred.disease;
    };

    const generatePDF = () => {
        const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('NeuroPredict - Medical Report', pageWidth / 2, 40, { align: 'center' });

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Patient: ${fullName}`, pageWidth / 2, 55, { align: 'center' });
        pdf.text(`Patient ID: ${identifier}`, pageWidth / 2, 63, { align: 'center' });

        pdf.setFontSize(10);
        pdf.text(
            'This confidential report provides an AI-assisted analysis to support clinical decision-making.',
            pageWidth / 2,
            75,
            { align: 'center' }
        );

        pdf.setDrawColor(0);
        pdf.line(20, 80, pageWidth - 20, 80);

        pdf.addPage('a4');

        const alz = predictions.filter(p => getCorrectDisease(p) === 'alzheimer');
        const park = predictions.filter(p => getCorrectDisease(p) === 'parkinson');
        const audio = predictions.filter(p => p.modality === 'audio');
        const drawing = predictions.filter(p => p.modality === 'drawing');

        const avgConfAudio = audio.length ? audio.reduce((s, p) => s + p.confidence, 0) / audio.length : 0;
        const avgConfDrawing = drawing.length ? drawing.reduce((s, p) => s + p.confidence, 0) / drawing.length : 0;

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Patient Information', 20, 25);

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        let y = 35;
        const infoSpacing = 7;

        pdf.text(`Full Name: ${fullName}`, 20, y);
        pdf.text(`National ID: ${nationalId}`, 20, y += infoSpacing);
        pdf.text(`Gender: ${gender}`, 20, y += infoSpacing);
        pdf.text(`Date of Birth: ${dateOfBirth}`, 20, y += infoSpacing);
        pdf.text(`Patient ID: ${identifier}`, 20, y += infoSpacing);
        pdf.text(`Known Conditions: ${knownConditions || '—'}`, 20, y += infoSpacing);
        pdf.text(`Notes: ${notes || '—'}`, 20, y += infoSpacing);

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Prediction History (AI Inference Summary)', 20, y + 12);

        const predictionRows = predictions.map(p => [
            new Date(p.timestamp).toLocaleDateString('en-GB'),
            getCorrectDisease(p).toUpperCase(),
            p.modality === 'audio' ? '—' : p.subtype,
            {
                audio: 'Audio',
                drawing: 'Drawing',
                mri_axial: 'MRI Axial',
                mri_sagittal: 'MRI Sagittal',
                ensemble: 'Ensemble'
            }[p.modality] || p.modality,
            `${Math.round(p.confidence * 100)}%`
        ]);

        autoTable(pdf, {
            startY: y + 18,
            head: [['Date', 'Disease', 'Subtype', 'Modality', 'Confidence']],
            body: predictionRows,
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: {
                fillColor: [22, 160, 133],
                textColor: 255,
                halign: 'center',
                fontStyle: 'bold'
            },
            margin: { left: 20, right: 20 }
        });

        pdf.addPage('a4');

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AI Medical Interpretation', 20, 25);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');

        let interpY = 35;
        const writeBlockSmart = (text, yPos) => {
            const wrapped = pdf.splitTextToSize(text, pageWidth - 40);
            const lineHeight = 5;
            wrapped.forEach(line => {
                if (yPos > pageHeight - 20) {
                    pdf.addPage();
                    yPos = 20; 
                }
                pdf.text(line, 20, yPos);
                yPos += lineHeight;
            });
            return yPos + 2;
        };


        const alzSubtypes = ['CN', 'EMCI', 'MCI', 'LMCI', 'AD'];
        let alzDetail = '';

        alzSubtypes.forEach(subtype => {
            const matches = alz.filter(p => p.subtype?.toUpperCase() === subtype);
            if (matches.length > 0) {
                const avg = Math.round(matches.reduce((a, b) => a + b.confidence, 0) / matches.length * 100);
                alzDetail += `${subtype}\n`;
                switch (subtype) {
                    case 'CN':
                        alzDetail += `Cognitively Normal: No signs of neurodegeneration. Hippocampal and cortical structures intact.
Symptoms: Normal memory and cognitive function.
Brain regions: No significant atrophy.
Proteins: Normal beta-amyloid and tau levels.
Recommendation: Routine annual cognitive screening, maintain healthy diet and exercise.
Care: No special care required.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                    case 'EMCI':
                        alzDetail += `Early Mild Cognitive Impairment: Early hippocampal shrinkage and subtle beta-amyloid buildup.
Symptoms: Mild short-term memory lapses, slight difficulty with complex tasks.
Brain regions: Hippocampus, entorhinal cortex.
Proteins: Slight decrease in soluble beta-amyloid, increased phosphorylated tau.
Recommendations: Repeat MRI in 12 months, consider CSF biomarker testing.
Care: Family support, lifestyle adjustment with Mediterranean diet and mental stimulation.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                    case 'MCI':
                        alzDetail += `Mild Cognitive Impairment: Clear short-term memory issues and some daily task challenges.
Symptoms: Frequent forgetfulness, misplaced items, occasional confusion.
Brain regions: Hippocampus, temporal cortex.
Proteins: Low CSF beta-amyloid, high total and phosphorylated tau.
Recommendations: PET Amyloid scan, neuropsychological testing.
Care: May need occasional assistance for daily planning, early caregiver education recommended.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                    case 'LMCI':
                        alzDetail += `Late Mild Cognitive Impairment: Advanced stage of MCI with significant daily memory and orientation problems.
Symptoms: Difficulty recognizing familiar people, misplacing objects, increased confusion.
Brain regions: Significant hippocampal atrophy, cortical thinning in temporal and parietal lobes.
Proteins: Widespread amyloid plaques and neurofibrillary tangles.
Recommendations: Prepare for assisted living, consider clinical trials for slowing progression.
Care: Daily support from family or professionals is advised.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                    case 'AD':
                        alzDetail += `Alzheimer's Dementia: Severe cognitive decline, functional dependence.
Symptoms: Profound memory loss, personality changes, difficulty with basic self-care.
Brain regions: Severe hippocampal and neocortical damage, enlarged ventricles.
Proteins: Heavy beta-amyloid plaque deposition and tau tangle accumulation, extensive synaptic loss.
Recommendations: Cholinesterase inhibitors (Donepezil), NMDA receptor antagonist (Memantine), palliative care planning.
Care: 24/7 supervision and comprehensive care planning.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                }
            }
        });

        interpY = writeBlockSmart(`Alzheimer Disease:\n\n${alzDetail || "No Alzheimer predictions available."}`, interpY);

        const parkSubtypes = ['CONTROL', 'PRODROMAL', 'SWEDD', 'PD'];
        let parkDetail = '';

        parkSubtypes.forEach(subtype => {
            const matches = park.filter(p => p.subtype?.toUpperCase() === subtype);
            if (matches.length > 0) {
                const avg = Math.round(matches.reduce((a, b) => a + b.confidence, 0) / matches.length * 100);
                parkDetail += `${subtype}\n`;
                switch (subtype) {
                    case 'CONTROL':
                        parkDetail += `Healthy Control: No motor or non-motor Parkinsonian symptoms.
Brain regions: Substantia nigra normal.
Proteins: Normal alpha-synuclein levels.
Recommendation: No further follow-up needed unless new symptoms appear.
Care: None required.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                    case 'PRODROMAL':
                        parkDetail += `Prodromal Parkinson's: Subtle early signs like loss of smell, constipation, or REM sleep disorder.
Brain regions: Early changes in olfactory bulb, lower brainstem.
Proteins: Initial alpha-synuclein misfolding may be present.
Recommendation: Annual neurological exams, possible DaTscan if motor symptoms arise.
Care: Encourage physical activity and healthy sleep patterns.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                    case 'SWEDD':
                        parkDetail += `SWEDD (Scans Without Evidence of Dopaminergic Deficit): Clinical Parkinsonian signs but normal dopaminergic scan.
Possible misdiagnosis: consider essential tremor or drug-induced parkinsonism.
Brain regions: Normal substantia nigra.
Proteins: No significant alpha-synuclein pathology.
Recommendation: Refer to a movement disorder specialist, reassess diagnosis.
Care: Depends on alternate cause.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                    case 'PD':
                        parkDetail += `Parkinson's Disease: Classic signs include resting tremor, muscle stiffness, slow movement, balance issues.
Brain regions: Neuronal loss in substantia nigra, reduced dopamine in basal ganglia.
Proteins: Accumulation of misfolded alpha-synuclein (Lewy bodies).
Recommendation: Start dopaminergic therapy (Levodopa), refer to physiotherapy, occupational therapy, and speech therapy.
Care: Daily support may be needed for mobility and activities of daily living.\nAverage confidence: ${avg}%.\n\n`;
                        break;
                }
            }
        });

        interpY = writeBlockSmart(`Parkinson Disease:\n\n${parkDetail || "No Parkinson predictions available."}`, interpY);

        if (audio.length) {
            interpY = writeBlockSmart(
                `Voice Analysis:
Speech signal analyzed for tremor, monotone delivery, and reduced pitch variation.
Indicates possible hypokinetic dysarthria typical of Parkinson's.
Recommendation: Combine with a clinical speech exam, consider referral to speech-language pathology.
Average audio confidence: ${Math.round(avgConfAudio * 100)}%.`,
                interpY
            );
        }

        if (drawing.length) {
            writeBlockSmart(
                `Drawing Analysis:
Handwriting and drawing speed assessed for tremor amplitude, micrographia, and motor slowing.
Indicative of Parkinsonian fine motor impairment.
Recommendation: Occupational therapy and fine motor skill exercises advised.
Average drawing confidence: ${Math.round(avgConfDrawing * 100)}%.`,
                interpY
            );
        }


        pdf.addPage('a4');
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Clinical Context and Guidance', 20, 30);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');

        const contextText = `
This report provides an AI-based overview of the patient's neurocognitive status derived from imaging, audio, and handwriting analyses.
It should be interpreted by qualified specialists alongside neuropsychological exams and daily functional assessments.
This complements but does not replace full clinical evaluation.
`;

        pdf.text(pdf.splitTextToSize(contextText, pageWidth - 40), 20, 40);

        const today = new Date().toLocaleDateString('en-GB');
        pdf.setFontSize(9);
        pdf.text(`Report generated by NeuroPredict on ${today}`, 20, pageHeight - 10);


        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
        }
        return pdf;
    };

    const exportToPDF = () => {
        const pdf = generatePDF();
        pdf.save(`Patient_${patient.identifier}_Report.pdf`);
    };

    const sendPDFByEmail = async () => {
        const pdf = generatePDF();
        const pdfBlob = pdf.output('blob');

        if (!emailAddress) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Email',
                text: 'Please enter an email address.'
            });
            return;
        }

        const formData = new FormData();
        formData.append('email', emailAddress);
        formData.append('pdf', new File([pdfBlob], `Patient_${patient.identifier}_Report.pdf`, { type: 'application/pdf' }));

        try {
            const response = await fetch('http://localhost:8080/api/report/sendReport', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                setShowEmailModal(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'The email was sent successfully.',
                    confirmButtonColor: '#3085d6'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: 'Failed to send email.'
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while sending the email.'
            });
        }
    };



    return (
        <div className={styles.card}>
            <h2>Patient Overview</h2>
            <div className={styles.detailsGrid}>
                {isEditing ? (
                    <>
                        <div className={styles.infoBlock}>
                            <h4>Personal Info</h4>
                            <p>
                                <span className={styles.label}>Full Name:</span>
                                <input
                                    value={editedPatient.fullName}
                                    onChange={(e) =>
                                        setEditedPatient({ ...editedPatient, fullName: e.target.value })
                                    }
                                />
                            </p>
                            <p>
                                <span className={styles.label}>National ID:</span>
                                <input
                                    value={editedPatient.nationalId}
                                    onChange={(e) =>
                                        setEditedPatient({ ...editedPatient, nationalId: e.target.value })
                                    }
                                />
                            </p>
                            <p>
                                <span className={styles.label}>Gender:</span>
                                <input
                                    value={editedPatient.gender}
                                    onChange={(e) =>
                                        setEditedPatient({ ...editedPatient, gender: e.target.value })
                                    }
                                />
                            </p>
                            <p>
                                <span className={styles.label}>Date of Birth:</span>
                                <input
                                    type="date"
                                    value={editedPatient.dateOfBirth}
                                    onChange={(e) =>
                                        setEditedPatient({ ...editedPatient, dateOfBirth: e.target.value })
                                    }
                                />
                            </p>
                        </div>

                        <div className={styles.infoBlock}>
                            <h4>Medical Info</h4>
                            <p>
                                <span className={styles.label}>Known Conditions:</span>
                                <input
                                    value={editedPatient.knownConditions}
                                    onChange={(e) =>
                                        setEditedPatient({ ...editedPatient, knownConditions: e.target.value })
                                    }
                                />
                            </p>
                            <p>
                                <span className={styles.label}>Notes:</span>
                                <input
                                    value={editedPatient.notes}
                                    onChange={(e) =>
                                        setEditedPatient({ ...editedPatient, notes: e.target.value })
                                    }
                                />
                            </p>
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <button onClick={handleUpdatePatient}>Save Changes</button>
                            <button onClick={() => setIsEditing(false)}>Cancel</button>
                        </div>

                    </>
                ) : (
                    <>
                        <div className={styles.infoBlock}>
                            <h4>
                                <UserRound size={17} style={{ marginRight: '6px' }} />
                                Personal Info

                            </h4>
                            <p><span className={styles.label}>Full Name:</span> {fullName}</p>
                            <p><span className={styles.label}>National ID:</span> {nationalId}</p>
                            <p><span className={styles.label}>Gender:</span> {gender}</p>
                            <p><span className={styles.label}>Date of Birth:</span> {dateOfBirth}</p>
                        </div>

                        <div className={styles.infoBlock}>
                            <h4>
                                <Stethoscope size={17} style={{ marginRight: '6px' }} />
                                Medical Info
                            </h4>
                            <p><span className={styles.label}>Known Conditions:</span> {knownConditions}</p>
                            <p><span className={styles.label}>Notes:</span> {notes}</p>
                        </div>
                    </>
                )}
            </div>



            <div className={styles.predictionsSection}>
                <h3>Prediction History</h3>
                {predictions.length === 0 ? (
                    <p>No predictions yet.</p>
                ) : (
                    <>
                        <div className={styles.timeline}>
                            {predictions
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .slice(0, showAllPredictions ? predictions.length : 3)
                                .map((pred, i) => (
                                    <div key={i} className={styles.timelineItem}>
                                        <div className={styles.timelineDot}></div>
                                        <div className={styles.timelineContent}>
                                            <p className={styles.predDate}>
                                                {new Date(pred.timestamp).toLocaleDateString('en-GB')}
                                            </p>
                                            <p><strong>{getCorrectDisease(pred).toUpperCase()}</strong> {pred.modality !== 'audio' && ` — subtype ${pred.subtype}`}</p>
                                            <p>Confidence: <strong>{Math.round(pred.confidence * 100)}%</strong></p>
                                            <p>Modality: <em>{pred.modality}</em></p>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {predictions.length > 3 && (
                            <p onClick={() => setShowAllPredictions(!showAllPredictions)}
                               style={{ color: '#2c7be5', cursor: 'pointer', marginTop: '1rem', fontWeight: '500' }}>
                                {showAllPredictions ? 'Show less ▲' : 'Show more ▼'}
                            </p>
                        )}

                        <div className={styles.buttonRow}>
                            <button className={styles.exportBtn} onClick={() => setShowStats(!showStats)}>
                                {showStats ? 'Hide Prediction Stats' : 'View Prediction Stats'}
                            </button>

                            <button className={styles.exportBtn} onClick={exportToPDF}>
                                Export Patient Report
                            </button>

                            <button className={styles.exportBtn} onClick={() => setShowEmailModal(true)}>
                                Send Report by Email
                            </button>
                        </div>

                        {statusMessage && (
                            <div className={`${styles.toastTopCenter} ${statusType === 'success' ? styles.toastSuccess : styles.toastError}`}>
                                {statusMessage}
                            </div>
                        )}


                        {showStats && (
                            <div className={styles.chartBox}>
                                <PatientStats predictions={predictions.map(p => ({ ...p, disease: getCorrectDisease(p) }))} />
                            </div>
                        )}

                        {showEmailModal && (
                            <div className={styles.modalOverlay}>
                                <div className={styles.modalContent}>
                                    <h3>Send Report by Email</h3>
                                    <input
                                        type="email"
                                        placeholder="Enter recipient email"
                                        value={emailAddress}
                                        onChange={(e) => setEmailAddress(e.target.value)}
                                        className={styles.modalInput}
                                    />
                                    <div className={styles.modalButtons}>
                                        <button
                                            className={styles.modalBtn}
                                            onClick={async () => {
                                                await sendPDFByEmail();
                                                if (statusType === 'success') {
                                                    setShowEmailModal(false);
                                                    setEmailAddress('');
                                                }
                                            }}
                                        >
                                            Send
                                        </button>

                                        <button
                                            className={styles.modalBtnCancel}
                                            onClick={() => setShowEmailModal(false)}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PatientDetails;
