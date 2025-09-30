import React, {useEffect, useRef, useState} from 'react';
import styles from './AlzheimerPrediction.module.css';
import { getCamStatus, predictAlzheimer, savePrediction } from '../../api/PredictionApi.jsx';
import { getAllPatients } from "../../api/PatientApi.jsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import AxialImage from '../../assets/axial.jpeg';
import SagittalImage from '../../assets/sagittal.jpeg';
import ZoomableImage from "../../components/Image/ZoomableImage.jsx";

const AlzheimerPrediction = () => {
    const [file, setFile] = useState(null);
    const [modality, setModality] = useState('');
    const [result, setResult] = useState(null);
    const [delayedResult, setDelayedResult] = useState(null);
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [fileType, setFileType] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingDots, setLoadingDots] = useState('');
    const [generatingGradcam, setGeneratingGradcam] = useState(false);
    const [generatingPrediction, setGeneratingPrediction] = useState(false);
    const [generatingSpectrogram, setGeneratingSpectrogram] = useState(false);
    useRef(null);
    const predictionResultRef = useRef(null);


    const referenceImage = modality === 'mri_axial'
        ? AxialImage
        : modality === 'mri_sagittal'
            ? SagittalImage
            : null;

    useEffect(() => {
        let interval;
        if (loading || generatingGradcam || generatingSpectrogram) {
            interval = setInterval(() => {
                setLoadingDots(prev => (prev === '........' ? '' : prev + '.'));
            }, 500);
        } else {
            setLoadingDots('');
        }
        return () => clearInterval(interval);
    }, [loading, generatingGradcam, generatingSpectrogram]);

    useEffect(() => {
        getAllPatients().then(setPatients).catch(console.error);
    }, []);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setFile(selected);
        if (selected) {
            const url = URL.createObjectURL(selected);
            setPreviewUrl(url);
            setFileType(selected.type.startsWith('image') ? 'image' :
                selected.type.startsWith('audio') ? 'audio' : 'other');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setDelayedResult(null);
        setLoading(true);
        setGeneratingPrediction(true);
        setGeneratingGradcam(false);
        setGeneratingSpectrogram(false);

        if (!file || !modality || !patientId) {
            setError("Please select a file, modality and patient.");
            setGeneratingPrediction(false);
            setLoading(false);
            return;
        }

        try {
            let predictionResult = await predictAlzheimer(file, modality);

            if (typeof predictionResult === "string") {
                try {
                    predictionResult = JSON.parse(predictionResult);
                    // eslint-disable-next-line no-unused-vars
                } catch (e) {
                    throw new Error("Invalid JSON format from backend");
                }
            }

            setResult(predictionResult);

            const subtype = predictionResult?.predicted_class;
            const confidence = predictionResult?.confidence;

            if (!subtype || confidence === undefined) {
                throw new Error("Missing prediction subtype or confidence");
            }

            await savePrediction({
                disease: "alzheimer",
                modality,
                patientId
            }, subtype, confidence);

            if (modality === 'audio' && predictionResult?.spectrogram_url) {
                setGeneratingSpectrogram(true);
                setTimeout(() => {
                    setGeneratingSpectrogram(false);
                }, 8000);
            }

            if (file.type.startsWith("image") && predictionResult.prediction_id) {
                setGeneratingGradcam(true);
                const interval = setInterval(async () => {
                    try {
                        const camData = await getCamStatus(predictionResult.prediction_id);
                        if (camData?.gradcam_url) {
                            setResult((prev) => ({
                                ...prev,
                                ...camData
                            }));
                            setGeneratingGradcam(false);
                            clearInterval(interval);
                        }
                    } catch (err) {
                        console.error("Polling CAM failed", err);
                    }
                }, 3000);
            }


            setTimeout(() => {
                setDelayedResult(predictionResult);
                setGeneratingPrediction(false);
                predictionResultRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 5000);

        } catch (err) {
            console.error("Prediction or save failed", err);
            setError("Prediction failed or could not be saved. Please try again.");
        } finally {
            setLoading(false);

        }

    };

    const getContextualInterpretation = (predictedClass, confidence, probabilities, activationZone = null) => {
        const confidenceLevel = confidence > 0.9
            ? "very strong"
            : confidence > 0.75
                ? "high"
                : confidence > 0.5
                    ? "moderate"
                    : "low";

        const classDescriptions = {
            AD: "Alzheimer’s Disease is a late-stage neurodegenerative condition marked by significant memory loss, impaired reasoning, and behavioral changes. Structural brain changes are usually visible on imaging.",
            CN: "Cognitively Normal (CN) individuals show no signs of neurodegeneration or memory impairment. MRI scans usually show no abnormal activations.",
            MCI: "Mild Cognitive Impairment (MCI) reflects a general early-stage decline in memory or thinking skills. It does not always progress to dementia, but requires monitoring.",
            EMCI: "Early Mild Cognitive Impairment (EMCI) includes subtle memory issues, often without impact on daily activities. This stage can precede LMCI or AD.",
            LMCI: "Late Mild Cognitive Impairment (LMCI) is a more advanced form of cognitive decline, where functional changes start to be more noticeable. It is considered a high-risk stage for Alzheimer's progression."
        };

        const generalExplanation = classDescriptions[predictedClass] || "No general information available for this class.";

        const sorted = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
        const [topClass, topScore] = sorted[0];
        const [secondClass, secondScore] = sorted[1];
        const diff = Math.abs(topScore - secondScore);

        let overlapExplanation = "";
        if (diff < 0.1 && secondClass !== "MCI") {
            overlapExplanation = `The model also found similar patterns between <strong>${topClass}</strong> (${(topScore * 100).toFixed(2)}%) and <strong>${secondClass}</strong> (${(secondScore * 100).toFixed(2)}%), suggesting possible overlap in imaging features.`;
            if (
                (topClass === "EMCI" && secondClass === "CN") ||
                (topClass === "LMCI" && secondClass === "AD") ||
                (topClass === "MCI" && secondClass === "EMCI") ||
                (topClass === "EMCI" && secondClass === "LMCI")
            ) {
                overlapExplanation += ` This is common in early cognitive decline stages, where brain structure changes are subtle.`;
            }
        }



        return (
            <>
                <p>
                    The model predicted <strong>{predictedClass}</strong> with a confidence of <strong>{(confidence * 100).toFixed(2)}%</strong>, indicating a <strong>{confidenceLevel}</strong> certainty level.
                </p>

                {activationZone && (
                    <p>
                        The CAM analysis showed notable activation in the <strong>{activationZone}</strong>, a brain region often associated with this subtype.
                    </p>
                )}

                {overlapExplanation && <p dangerouslySetInnerHTML={{ __html: overlapExplanation }}></p>}

                <p><strong></strong> {generalExplanation}</p>
            </>
        );
    };

    const getModelInsight = (regionScores) => {
        if (!regionScores || Object.keys(regionScores).length === 0) return null;

        const zoneExplanations = {
            "Frontal Lobe": "This region is responsible for planning, decision-making, and social behavior. In Alzheimer’s, changes here are often linked to poor judgment, personality shifts, or impaired reasoning.",
            "Temporal Lobe": "Associated with memory and language. High activation may indicate early neurodegenerative signs, including difficulty understanding or forming speech.",
            "Parietal Lobe": "Controls spatial awareness and attention. In Alzheimer’s, this may reflect navigation difficulties or trouble recognizing locations.",
            "Occipital Lobe": "Responsible for processing visual information. High activity here could indicate advanced misinterpretation of visual cues or hallucinations.",
            "Hippocampus": "Central to memory formation and spatial orientation. It is one of the earliest regions affected in Alzheimer’s disease.",
            "Occipital/Parietal Lobe": "This combined region handles both spatial reasoning and visual processing. Activation here may reflect difficulties with coordination, perception, or misinterpretation of surroundings.",
            "Temporo-parietal": "This junction is key to comprehension and language processing. It is often one of the earliest regions affected in Alzheimer’s, correlating with confusion and difficulty understanding information.",
            "Hippocampal/Parietal": "This region includes the hippocampus and parietal lobe, both critical in memory and spatial cognition. Changes here often signal early Alzheimer’s symptoms such as disorientation or memory lapses.",
            "Fronto-temporal": "This region spans functions of both the frontal and temporal lobes, affecting personality, behavior, and language. In Alzheimer’s, co-activation may relate to progressive cognitive and social impairments.",
            "Fronto-parietal": "Integration of attention and decision-making functions. Impairments here may reflect issues with focus, multitasking, or goal-directed behavior.",
            "Posterior Cingulate": "Part of the default mode network, frequently affected early in Alzheimer’s. Hypoactivity here may indicate disconnection in memory and awareness processing circuits.",
            "Precuneus": "A key hub in spatial processing and episodic memory. Often shows early metabolic decline in Alzheimer’s patients.",
        };

        return (
            <div className={styles.modelInsightBox}>
                <h4> Model Insight by Brain Region</h4>
                <p className={styles.explanationText}>
                    The model highlights brain areas based on activation levels:
                    <ul>
                        <li><strong>Average</strong> – overall neural importance across the entire region.</li>
                        <li><strong>Peak</strong> – the highest point of attention focus within the region.</li>
                    </ul>
                </p>

                {Object.entries(regionScores).map(([region, values]) => {
                    const { average, peak } = values;
                    const avgPct = (average * 100).toFixed(1);
                    const peakPct = (peak * 100).toFixed(1);

                    let barColor = '#d73027';
                    if (average >= 0.4) {
                        barColor = '#d73027';
                    } else if (average >= 0.2) {
                        barColor = '#fdae61';
                    } else if (average >= 0.05) {
                        barColor = '#ffffbf';
                    } else {
                        barColor = '#a6d96a';
                    }

                    const strengthLabel = average >= 0.4 ? "High"
                        : average >= 0.2 ? "Moderate"
                            : average >= 0.05 ? "Low"
                                : "Very Low";

                    const formattedRegion = region.charAt(0).toUpperCase() + region.slice(1);
                    const explanationEntry = Object.entries(zoneExplanations).find(([key]) =>
                        formattedRegion.toLowerCase().includes(key.toLowerCase())
                    );
                    const explanation = explanationEntry ? explanationEntry[1] : "No detailed explanation available.";

                    return (
                        <div className={styles.regionCard} key={region}>
                            <div className={styles.regionHeader}>
                                <h5>{formattedRegion}</h5>
                            </div>

                            <div className={styles.regionRow}>
                                <div className={styles.regionLeft}>
                <span className={`${styles.badgeLabel} ${styles[`badge_${strengthLabel.replace(' ', '').toLowerCase()}`]}`}>
                  {strengthLabel} Activation
                </span>

                                    <div className={styles.barLine}>
                                        <div
                                            className={styles.barFill}
                                            style={{ width: `${avgPct}%`, backgroundColor: barColor, color: average >= 0.4 ? '#fff' : '#333' }}
                                        >
                                            Average — {avgPct}%
                                        </div>
                                    </div>

                                    <div className={styles.barLine}>
                                        <div
                                            className={styles.barFill}
                                            style={{ width: `${peakPct}%`, backgroundColor: barColor, color: average >= 0.4 ? '#fff' : '#333' }}
                                        >
                                            Peak — {peakPct}%
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.regionRight}>
                                    <p className={styles.attentionNote}>
                                        {average < 0.2
                                            ? "The model showed limited attention in this area."
                                            : average >= 0.4
                                                ? "This region played a significant role in the model’s prediction."
                                                : "The model showed moderate attention in this area."}
                                    </p>
                                    <p className={styles.explanation}><em>{explanation}</em></p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };


    return (
        <div className={styles.pageWrapper}>
            <div className={styles.column}>
                <h2 className={styles.title}>Alzheimer Prediction</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <label>Select Patient:</label>
                    <select
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        required
                    >
                        <option value="">-- Select Patient --</option>
                        {patients
                            .slice()
                            .sort((a, b) => {
                                const nameA = a.fullName || a.identifier;
                                const nameB = b.fullName || b.identifier;
                                return nameA.localeCompare(nameB);
                            })
                            .map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.fullName ? `${p.fullName} (${p.identifier})` : p.identifier}
                                </option>
                            ))}
                    </select>


                    <label>Choose Modality:</label>
                    <select
                        value={modality}
                        onChange={(e) => setModality(e.target.value)}
                        required
                    >
                        <option value="">-- Select --</option>
                        <option value="mri_axial">MRI Axial</option>
                        <option value="mri_sagittal">MRI Sagittal</option>

                    </select>

                    <label>Upload File:</label>
                    <input
                        type="file"
                        accept="image/*,audio/*"
                        onChange={handleFileChange}
                        required
                    />

                    {previewUrl && (
                        <div className={styles.previewBox}>
                            {fileType === 'image' && (
                                <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                            )}
                            {fileType === 'audio' && (
                                <audio controls className={styles.previewAudio}>
                                    <source src={previewUrl} />
                                    Your browser does not support the audio element.
                                </audio>
                            )}
                        </div>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Predicting..." : "Predict"}
                    </button>
                    {error && <p className={styles.error}>{error}</p>}
                </form>
            </div>

            <div className={styles.column}>
                <h2 className={styles.title}>Prediction Result</h2>
                {generatingPrediction && (
                    <p className={styles.loadingNote}>
                        Generating prediction. Please wait...<span>{loadingDots}</span>
                    </p>
                )}


                {delayedResult && delayedResult.predicted_class && (
                    <div className={styles.resultBox}>
                        <p>
                            <strong>Predicted Class:</strong>{' '}
                            <span className={`${styles.badge} ${styles[result.predicted_class.toLowerCase()]}`}>
                                {result.predicted_class}
                            </span>
                        </p>

                        <p className={styles.confidenceRow}>
                            <strong>Accuracy:</strong>{' '}
                            <span className={styles.confidenceValue}>
                                {(result.confidence * 100).toFixed(2)}%
                            </span>.{' '}
                            <span className={styles.confidenceTooltip}>
                                This indicates the model’s certainty for this classification.
                            </span>
                        </p>


                        <div className={styles.probabilitiesRow}>
                            <div className={styles.probabilitiesList}>
                                <h4>Prediction Probabilities</h4>
                                <ul>
                                    {Object.entries(result.probabilities).map(([label, value]) => (
                                        <li key={label}>
                                            <strong>{label}:</strong> {(value * 100).toFixed(2)}%
                                        </li>
                                    ))}
                                </ul>
                            </div>


                            <div className={styles.probabilitiesExplanation}>

                                <ul>
                                    {[
                                        {
                                            code: "AD",
                                            name: "Alzheimer’s Disease",
                                            desc: "Advanced neurodegeneration affecting widespread brain regions, including the hippocampus, temporal and parietal lobes. Leads to severe memory loss, behavioral changes, and impaired daily functioning."
                                        },
                                        {
                                            code: "CN",
                                            name: "Cognitively Normal",
                                            desc: "No detectable atrophy or abnormal activation in brain structures. Normal hippocampal volume and preserved cortical function are typical."
                                        },
                                        {
                                            code: "EMCI",
                                            name: "Early Mild Cognitive Impairment",
                                            desc: "Early signs of hippocampal atrophy and subtle changes in the entorhinal cortex. Patients may have subjective memory complaints but relatively preserved independence."
                                        },
                                        {
                                            code: "LMCI",
                                            name: "Late Mild Cognitive Impairment",
                                            desc: "More pronounced degeneration in the hippocampus and parietal lobe, often with early spread to the posterior cingulate and temporal cortex. Functional deficits begin to emerge."
                                        },
                                        {
                                            code: "MCI",
                                            name: "Mild Cognitive Impairment",
                                            desc: "Mild structural decline, primarily in the medial temporal lobe, with varying involvement of prefrontal and parietal regions. May remain stable or evolve into Alzheimer’s."
                                        }
                                    ].map(item => (
                                        <li key={item.code}>
                                            <strong>{item.code}</strong>{' '}
                                            <span className={styles.badge}>
        {item.name}
      </span>
                                            : {item.desc}
                                        </li>
                                    ))}
                                </ul>

                                <p className={styles.classNote}>
                                    Note: Some class probabilities may be close due to overlapping features, especially between EMCI, LMCI, and early AD stages.
                                </p>
                            </div>
                        </div>
                        {delayedResult && delayedResult.probabilities && (

                                <div className={styles.classExplanationBox}>
                                    <h4>Contextual Interpretation</h4>
                                    {getContextualInterpretation(result.predicted_class, result.confidence, result.probabilities)}
                                </div>

                                )}
                    </div>
                )}

                {modality === 'audio' && result?.spectrogram_url && !generatingSpectrogram ? (

                    <>
                        <div style={{ marginTop: '60px' }}></div>
                        <h2 className={styles.title}>Spectrogram Visualization</h2>
                        <div className={styles.resultBox}>
                            <div className={styles.gradcamContainer}>
                                <div className={styles.gradcamContainerVertical}>
                                    <div className={styles.gradcamImageContainer}>
                                        <ZoomableImage
                                            src={`http://localhost:8001${result.spectrogram_url}`}
                                            alt="Audio Spectrogram"
                                            className={styles.gradcamImage}
                                        />
                                    </div>
                                </div>

                                <div className={styles.gradcamInfo}>
                                    <h3> What is a Spectrogram?</h3>
                                    <p>
                                        A spectrogram is a visual representation of sound, showing how the intensity of different frequencies evolves over time.
                                        <br />
                                        It helps identify specific voice features—such as articulation, rhythm, or tremor—that may be affected in neurodegenerative diseases.
                                    </p>

                                    <h4> How to Read It</h4>
                                    <ul className={styles.zoneList}>
                                        <li><strong>X-axis (Time):</strong> Progression of the audio signal</li>
                                        <li><strong>Y-axis (Frequency):</strong> Low (bottom) to high (top) pitch</li>
                                        <li><strong>Color Intensity:</strong> Brighter areas indicate stronger acoustic energy</li>
                                    </ul>

                                    <h4> Frequency Insight</h4>
                                    <ul className={styles.zoneList}>
                                        <li><strong>0–500 Hz:</strong> Low frequencies – may reflect tremor or breathiness</li>
                                        <li><strong>500–2000 Hz:</strong> Core speech articulation and phonation</li>
                                        <li><strong>2000–8000 Hz:</strong> High-frequency cues like consonant clarity and sibilance</li>
                                    </ul>

                                    <p className={styles.classNote}>
                                        Note: Irregularities, missing high-frequency components, or blurred transitions may indicate early vocal impairments linked to Alzheimer’s or Parkinson’s disease.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : modality === 'audio' && generatingSpectrogram ? (
                    <>
                        <h2 className={styles.title}>Spectrogram Visualization</h2>
                        <p className={styles.loadingNote}>
                            Spectrogram is being generated...<span>{loadingDots}</span>
                        </p>
                    </>
                ) : (result?.gradcam_url || generatingGradcam) && (

                    <>
                        <h2 className={styles.title}>CAM Visualization</h2>

                        {generatingGradcam && (
                            <p className={styles.loadingNote}>
                                Generating CAM. This may take up to 20 seconds.<span>{loadingDots}</span>
                            </p>
                        )}

                        {result?.gradcam_url && (
                            <div className={styles.resultBox}>
                                <div className={styles.gradcamContainer}>
                                    <div className={styles.gradcamContainerVertical}>
                                        <div className={styles.gradcamImageContainer}>
                                            <ZoomableImage
                                                src={`http://localhost:8001${result.gradcam_url}`}
                                                alt="Grad-CAM"
                                                className={styles.gradcamImage}
                                            />
                                        </div>
                                        {referenceImage && (
                                            <div className={styles.gradcamImageContainer}>
                                                <ZoomableImage
                                                    src={referenceImage}
                                                    alt="Reference Brain View"
                                                    className={styles.gradcamImage}
                                                    attribution={
                                                        <>
                                                            Image courtesy of Maciej Debowski,{' '}
                                                            <a
                                                                href="https://radiopaedia.org/cases/61691"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: '#ddd', textDecoration: 'underline dotted' }}
                                                            >
                                                                Radiopaedia.org, rID: 61691
                                                            </a>
                                                        </>
                                                    }
                                                />
                                            </div>
                                        )}

                                    </div>

                                    <div className={styles.gradcamInfo}>
                                        <h3> What is CAM?</h3>
                                        <p>
                                            CAM (Class Activation Map) highlights the brain regions that most influenced the model’s prediction for this image.
                                        </p>

                                        <h4>Color Legend</h4>
                                        <div className={styles.colorLegend}>
                                            <div className={styles.colorRow}>
                                                <div className={styles.colorBox} style={{ background: '#d73027' }}></div> High Attention
                                            </div>
                                            <div className={styles.colorRow}>
                                                <div className={styles.colorBox} style={{ background: '#fdae61' }}></div> Moderate Attention
                                            </div>
                                            <div className={styles.colorRow}>
                                                <div className={styles.colorBox} style={{ background: '#ffffbf' }}></div> Low Attention
                                            </div>
                                            <div className={styles.colorRow}>
                                                <div className={styles.colorBox} style={{ background: '#a6d96a' }}></div> Very Low / Minimal Attention
                                            </div>
                                        </div>


                                        <h4> Relevant Brain Zones</h4>
                                        <ul className={styles.zoneList}>
                                            <li><strong>Frontal Lobe:</strong> Planning, reasoning, behavior</li>
                                            <li><strong>Temporal Lobe:</strong> Memory, language</li>
                                            <li><strong>Parietal Lobe:</strong> Sensory integration, attention</li>
                                            <li><strong>Occipital Lobe:</strong> Visual processing</li>
                                        </ul>
                                    </div>

                                    {getModelInsight(result.region_scores)}
                                </div>
                            </div>
                        )}
                        {result?.gradcam_url && (
                            <div className={styles.resultBox}>
                                <div className={styles.modelDetailsBox}>
                                    <h4>Model Information</h4>
                                    <div className={styles.infoRow}>
                                        <strong>Architecture:</strong> ResNet50, 101 Ensemble
                                    </div>
                                    <div className={styles.infoRow}>
                                        <strong>Input:</strong> 256×256 Axial and Sagittal MRI
                                    </div>
                                    <div className={styles.infoRow}>
                                        <strong>Performance:</strong> MRI Axial ~94.6%, MRI Sagittal ~98.95%
                                    </div>
                                    <div className={styles.infoRow} style={{ fontSize: "0.85em", color: "#555" }}>
                                        Last Updated: May 2025
                                    </div>
                                </div>


                                <div className={styles.nextStepsBox}>
                                    <h4> Suggested Next Steps for Clinicians</h4>
                                    <ul className={styles.stepsList}>
                                        <li>Review MRI manually and compare with historical scans if available.</li>
                                        <li>Correlate with clinical symptoms and cognitive testing (e.g. MMSE, MoCA).</li>
                                        <li>Recommend follow-up MRI or advanced imaging (e.g. PET scan) if confidence is moderate.</li>
                                        <li>Refer to neurology or memory clinic for multidisciplinary assessment.</li>
                                        <li>Use prediction as complementary evidence - not a standalone diagnostic.</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                    </>

                )}


                    </div>
        </div>
    );
};

export default AlzheimerPrediction;
