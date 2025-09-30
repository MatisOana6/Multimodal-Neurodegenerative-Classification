import React, { useEffect, useRef, useState } from 'react';
import styles from './ParkinsonPrediction.module.css';
import { getCamStatus, predictParkinson, savePrediction } from '../../api/PredictionApi.jsx';
import { getAllPatients } from '../../api/PatientApi.jsx';
import ScreenImage from '../../assets/sagittal.jpeg';
import ZoomableImage from '../../components/Image/ZoomableImage.jsx';

const ParkinsonPrediction = () => {
    const [file, setFile] = useState(null);
    const [modality, setModality] = useState('');
    const [result, setResult] = useState(null);
    const [delayedResult, setDelayedResult] = useState(null);
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [, setFileType] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingDots, setLoadingDots] = useState('');
    const [generatingGradcam, setGeneratingGradcam] = useState(false);
    const [generatingPrediction, setGeneratingPrediction] = useState(false);
    const predictionResultRef = useRef(null);
    const [zoomSrc, setZoomSrc] = useState(null);
    const buildMetric = (name, value) => ({
        name,
        value,
        label: value?.toFixed(4) ?? "-"
    });

    const openZoom = (src) => setZoomSrc(src);
    const closeZoom = () => setZoomSrc(null);
    useEffect(() => {
        getAllPatients().then(setPatients).catch(console.error);
    }, []);

    useEffect(() => {
        let interval;
        if (loading || generatingGradcam) {
            interval = setInterval(() => {
                setLoadingDots(prev => (prev === '........' ? '' : prev + '.'));
            }, 500);
        } else {
            setLoadingDots('');
        }
        return () => clearInterval(interval);
    }, [loading, generatingGradcam]);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setFile(selected);
        if (selected) {
            const url = URL.createObjectURL(selected);
            setPreviewUrl(url);
            setFileType(selected.type.startsWith('image') ? 'image' : 'other');
        }
    };
    const getModelInsight = (regionScores) => {
        if (!regionScores || Object.keys(regionScores).length === 0) return null;

        const zoneExplanations = {
            frontal: "Frontal lobe changes may indicate cognitive decline or executive dysfunction related to Parkinson’s progression.",
            temporal: "Temporal lobe alterations are often associated with motor planning and memory, possibly linked to tremor onset.",
            parietal: "Parietal regions may be affected in atypical Parkinsonian syndromes or in advanced cases.",
            occipital: "Occipital lobe changes are uncommon but may be seen in some atypical Parkinsonian disorders affecting visual processing.",
            hippocampus: "While less common, hippocampal involvement can reflect memory deficits in later stages.",
            "occipital/parietal": "Combined occipital-parietal involvement may appear in advanced or mixed pathology cases."
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


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setDelayedResult(null);
        setLoading(true);
        setGeneratingPrediction(true);
        setGeneratingGradcam(false);

        if (!file || !modality || !patientId) {
            setError("Please select a file, modality and patient.");
            setGeneratingPrediction(false);
            setLoading(false);
            return;
        }

        try {
            let predictionResult = await predictParkinson(file, modality);
            if (typeof predictionResult === "string") {
                predictionResult = JSON.parse(predictionResult);
            }

            console.log("RAW PREDICTION:", predictionResult);

            let subtype = predictionResult.predicted_class;
            if (subtype === "Parkinson") subtype = "PD";
            if (subtype === "Healthy") subtype = "Control";

            await savePrediction(
                { disease: "parkinson", modality, patientId },
                subtype,
                predictionResult.confidence
            );

            setResult(predictionResult);
            setGeneratingPrediction(false);

            if (modality === "mri" && file.type.startsWith("image") && predictionResult.prediction_id) {
                setGeneratingGradcam(true);
                const interval = setInterval(async () => {
                    const camData = await getCamStatus(predictionResult.prediction_id);
                    if (camData?.gradcam_url) {
                        setResult(prev => ({ ...prev, ...camData }));
                        setGeneratingGradcam(false);
                        clearInterval(interval);
                    }
                }, 3000);
            }

            setDelayedResult(predictionResult);
            predictionResultRef.current?.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error("Prediction failed", err);
            setError("Prediction failed. Please try again.");
            setGeneratingPrediction(false);
            setGeneratingGradcam(false);
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
            Parkinson: modality === 'drawing'
                ? "The drawing test indicates possible signs of tremor, irregularity or micrographia, which are typical for Parkinson’s motor impairment."
                : "Parkinson’s Disease is a progressive neurodegenerative disorder causing tremor, rigidity and motor dysfunction due to dopamine neuron loss.",

            Healthy: modality === 'drawing'
                ? "The drawing shows smooth, regular lines and curves without interruptions or shakiness, indicating healthy motor control with no signs of Parkinson’s."
                : "No clinical or imaging evidence of Parkinsonian symptoms. Brain structures appear normal.",

            PD: "Parkinson’s Disease detected via MRI analysis.",
            Control: "Healthy control brain structure on MRI.",
            Prodromal: "Early signs visible on MRI — mild symptoms and subtle changes.",
            SWEDD: "Parkinson-like symptoms without dopaminergic deficit on MRI."
        };

        const generalExplanation = classDescriptions[predictedClass] || "No general information available for this class.";

        let overlapExplanation = "";
        if (modality !== 'drawing') {
            const sorted = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
            const [topClass, topScore] = sorted[0];
            const [secondClass, secondScore] = sorted[1];
            const diff = Math.abs(topScore - secondScore);

            if (diff < 0.1) {
                overlapExplanation = `The model also found similar patterns between <strong>${topClass}</strong> (${(topScore * 100).toFixed(2)}%) and <strong>${secondClass}</strong> (${(secondScore * 100).toFixed(2)}%), suggesting possible overlap.`;
                if (
                    (topClass === "PD" && secondClass === "SWEDD") ||
                    (topClass === "Prodromal" && secondClass === "Control") ||
                    (topClass === "SWEDD" && secondClass === "Prodromal")
                ) {
                    overlapExplanation += ` This is typical in early or ambiguous cases of Parkinsonism.`;
                }
            }
        }

        return (
            <>
                <p>
                    The model predicted <strong>{predictedClass}</strong> with a confidence of <strong>{(confidence * 100).toFixed(2)}%</strong>, indicating a <strong>{confidenceLevel}</strong> certainty level.
                </p>
                {activationZone && (
                    <p>
                        The CAM analysis showed notable activation in the <strong>{activationZone}</strong>.
                    </p>
                )}
                {overlapExplanation && <p dangerouslySetInnerHTML={{ __html: overlapExplanation }}></p>}
                <p>{generalExplanation}</p>
            </>
        );
    };


    return (
        <div className={styles.pageWrapper}>
            <div className={styles.column}>
                <h2 className={styles.title}>Parkinson Prediction</h2>
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
                    <select value={modality} onChange={(e) => setModality(e.target.value)} required>
                        <option value="">-- Select --</option>
                        <option value="mri">MRI</option>
                        <option value="drawing">Drawing</option>
                    </select>

                    <label>Upload File:</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} required />
                    {previewUrl && (
                        <div className={styles.previewBox}>
                            <img src={previewUrl} alt="Preview" className={styles.previewImage} />
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
                        Generating prediction<span>{loadingDots}</span>
                    </p>
                )}

                {delayedResult && delayedResult.predicted_class && (
                    <div className={styles.resultBox} ref={predictionResultRef}>
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ marginBottom: '6px' }}>
                                <strong>Predicted Class:</strong>{' '}
                                <span className={styles.badge}>{result.predicted_class}</span>
                            </p>
                            <p style={{ margin: 0 }}>
                                <strong>Accuracy:</strong> {(result.confidence * 100).toFixed(2)}%. This indicates the model’s certainty for this classification.
                            </p>
                        </div>


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
                                <h3>{modality === 'drawing' ? 'Drawing Test Classes' : 'Parkinson Subtype Classes'}</h3>
                                <ul>
                                    {modality === 'drawing' ? (
                                        <>
                                            <li>
                                                <strong>PD</strong>{' '}
                                                <span className={`${styles.badge} ${styles.PD}`}>
            Parkinson’s Disease
          </span>{' '}
                                                - The drawing indicates possible tremor, motor control difficulties or micrographia, which are common in Parkinson’s.
                                            </li>
                                            <li>
                                                <strong>Control</strong>{' '}
                                                <span className={`${styles.badge} ${styles.Control}`}>Healthy</span>{' '}
                                                - The drawing shows steady lines and consistent pressure, indicating normal motor control.
                                            </li>
                                        </>
                                    ) : (
                                        <>
                                            <li>
                                                <strong>PD</strong>{' '}
                                                <span className={`${styles.badge} ${styles.PD}`}>
            Parkinson’s Disease
          </span>{' '}
                                                - Progressive neurodegeneration primarily affecting the basal
                                                ganglia, substantia nigra, and related motor pathways. Leads to
                                                characteristic motor symptoms (tremor, rigidity, bradykinesia) and
                                                may involve mild changes in the frontal cortex contributing to
                                                executive dysfunction.
                                            </li>
                                            <li>
                                                <strong>Control</strong>{' '}
                                                <span className={`${styles.badge} ${styles.Control}`}>Healthy</span>{' '}
                                                - No structural or functional alterations detected in MRI. Basal
                                                ganglia, frontal cortex, and other motor-related brain regions
                                                appear normal.
                                            </li>
                                            <li>
                                                <strong>Prodromal</strong>{' '}
                                                <span className={`${styles.badge} ${styles.Prodromal}`}>
            Early Stage
          </span>{' '}
                                                - Preclinical stage with subtle neuronal loss in dopaminergic
                                                circuits. Minor changes may appear in the brainstem and early
                                                frontal or temporal connections before clear motor signs emerge.
                                            </li>
                                            <li>
                                                <strong>SWEDD</strong>{' '}
                                                <span className={`${styles.badge} ${styles.SWEDD}`}>Atypical</span>{' '}
                                                - Parkinson-like clinical features but without significant
                                                dopaminergic deficit on imaging. MRI may show normal basal ganglia;
                                                structural changes can appear in frontal or parietal regions if
                                                another disorder is present.
                                            </li>
                                        </>
                                    )}
                                </ul>

                                {modality !== 'drawing' && (
                                    <p className={styles.classNote}>
                                        Note: Overlap is common between SWEDD, Prodromal and early
                                        Parkinson’s.
                                    </p>
                                )}
                            </div>

                        </div>

                        <div className={styles.classExplanationBox}>
                            <h4>Contextual Interpretation</h4>
                            {getContextualInterpretation(
                                result.predicted_class,
                                result.confidence,
                                result.probabilities,
                                result.activation_zone
                            )}
                        </div>
                        {modality === 'drawing' && result?.drawing_index && (
                            <>
                                <h2 className={styles.title} style={{ marginBottom: '2px' }}>
                                    Drawing Analysis
                                </h2>

                                <div style={{ marginBottom: '0px' }}>
                                    <h3 style={{ marginTop: '0px', marginBottom: '6px' }}>Overview</h3>
                                    <p style={{ lineHeight: 1.6, margin: 0 }}>
                                        This overview summarizes the drawing’s smoothness, tremor indicators, and frequency-based features.
                                        Use each card to better understand signal consistency and possible signs of motor irregularities.
                                    </p>
                                </div>

                                {[
                                    {
                                        title: "Tremor Overlay",
                                        plot: result.tremor_overlay_url,
                                        alt: "Tremor Overlay",
                                        metrics: [],
                                        description:
                                            "Overlay with a soft frequency heatmap. Warmer colors highlight local frequency changes."
                                    },
                                    {
                                        title: "Frequency Spectrum & Radial Profile",
                                        plot: [result.fft_url, result.fft_radial_url],
                                        alt: "FFT Spectrum and Radial Profile",
                                        metrics: [
                                            buildMetric("High Frequency Power", result.drawing_index.metrics.high_freq_power)
                                        ],
                                        description:
                                            "This section shows how the frequency content of the drawing is distributed. The 2D FFT reveals repeating patterns and hidden vibrations, while the radial profile summarizes the frequency energy from center outward. A smooth, quickly decreasing curve suggests steady lines; higher mid-range values may indicate subtle hand tremor or irregular strokes."

                                    },
                                    {
                                        title: "Pixel & Texture Features",
                                        plot: null,
                                        metrics: [],
                                        description:
                                            "Table with pixel and texture metrics relevant for drawing quality."
                                    }
                                ].map((card, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            background: '#fff',
                                            borderRadius: '10px',
                                            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                            padding: '20px',
                                            marginBottom: '20px'
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'flex-start',
                                                justifyContent: 'space-between',
                                                gap: '30px'
                                            }}
                                        >

                                            <div style={{ flex: '1 1 350px', minWidth: '280px' }}>
                                                <h3>{card.title}</h3>
                                                <p style={{ marginBottom: '10px', whiteSpace: 'pre-line' }}>{card.description}</p>

                                                {index === 0 && (
                                                    <>
                                                        <h4 style={{ marginBottom: '4px' }}>Heatmap Color Legend</h4>
                                                        <ul style={{ listStyle: 'none', padding: 0, lineHeight: 1.6 }}>
                                                            <li><span style={{ color: '#0000ff', fontWeight: 'bold' }}>●</span> Smooth region</li>
                                                            <li><span style={{ color: '#00ffff', fontWeight: 'bold' }}>●</span> Mild curvature</li>
                                                            <li><span style={{ color: '#ffff00', fontWeight: 'bold' }}>●</span> Strong curvature / mild tremor</li>
                                                            <li><span style={{ color: '#ff0000', fontWeight: 'bold' }}>●</span> Sharp corner / pronounced tremor</li>
                                                        </ul>
                                                        <p style={{ fontSize: '0.85em', color: '#555' }}>
                                                            Note: Interpret colors in context.
                                                        </p>
                                                    </>
                                                )}
                                            </div>

                                            {Array.isArray(card.plot) ? (
                                                <div
                                                    style={{
                                                        flex: '1 1 auto',
                                                        minWidth: '200px',
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '10px',
                                                        justifyContent: 'flex-end'
                                                    }}
                                                >
                                                    {card.plot.map((plotUrl, i) => (
                                                        <img
                                                            key={i}
                                                            src={`http://localhost:8001${plotUrl}`}
                                                            alt={`${card.alt} ${i + 1}`}
                                                            style={{
                                                                width: '49%',
                                                                borderRadius: '10px',
                                                                cursor: 'zoom-in',
                                                                border: '1px solid #ddd'
                                                            }}
                                                            onClick={() => openZoom(`http://localhost:8001${plotUrl}`)}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                card.plot && (
                                                    <div
                                                        style={{
                                                            flex: '0 1 auto',
                                                            minWidth: '250px',
                                                            maxWidth: '400px',
                                                            marginLeft: 'auto',
                                                            textAlign: 'right'
                                                        }}
                                                    >
                                                        <img
                                                            src={`http://localhost:8001${card.plot}`}
                                                            alt={card.alt}
                                                            style={{
                                                                width: '100%',
                                                                height: 'auto',
                                                                borderRadius: '10px',
                                                                cursor: 'zoom-in',
                                                                border: '1px solid #ddd'
                                                            }}
                                                            onClick={() => openZoom(`http://localhost:8001${card.plot}`)}
                                                        />
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {
                                            index === 2 && (
                                                <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                                                    <table
                                                        style={{
                                                            width: '100%',
                                                            borderCollapse: 'collapse',
                                                            background: '#fff',
                                                            borderRadius: '12px',
                                                            overflow: 'hidden',
                                                            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                                                        }}
                                                    >
                                                        <thead style={{ background: '#f8fafc' }}>
                                                        <tr>
                                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Metric</th>
                                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Value</th>
                                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Recommended Range</th>
                                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Interpretation</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        {[
                                                            {
                                                                name: 'Stroke Mean',
                                                                value: Number(result.drawing_index.metrics.stroke_mean).toFixed(2),
                                                                range: '150–250',
                                                                meaning: 'Average darkness of the lines. Lower = faint lines, higher = very dark lines.'
                                                            },
                                                            {
                                                                name: 'Stroke Std',
                                                                value: Number(result.drawing_index.metrics.stroke_std).toFixed(2),
                                                                range: '2–8',
                                                                meaning: 'How much the darkness of the line varies. Small = uniform line, big = inconsistent line.'
                                                            },
                                                            {
                                                                name: 'Local Contrast',
                                                                value: Number(result.drawing_index.metrics.local_contrast).toFixed(2),
                                                                range: '8–20',
                                                                meaning: 'How well the edges stand out from the background. Higher = clearer contour.'
                                                            },
                                                            {
                                                                name: 'Entropy',
                                                                value: Number(result.drawing_index.metrics.entropy).toFixed(2),
                                                                range: '0.3–0.7',
                                                                meaning: 'Level of detail. Low = simple and clean, high = complex or noisy.'
                                                            },
                                                            {
                                                                name: 'GLCM Contrast',
                                                                value: Number(result.drawing_index.metrics.glcm_contrast).toFixed(2),
                                                                range: '500–3000',
                                                                meaning: 'How much the texture varies. Higher may indicate tremor or rough texture.'
                                                            }
                                                        ]
                                                            .map((row, idx) => (
                                                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                                                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{row.name}</td>
                                                                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{row.value}</td>
                                                                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{row.range}</td>
                                                                <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{row.meaning}</td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        }

                                    </div>
                                ))}

                                {zoomSrc && (
                                    <div
                                        onClick={closeZoom}
                                        style={{
                                            position: 'fixed',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'rgba(0,0,0,0.85)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 9999,
                                            cursor: 'zoom-out'
                                        }}
                                    >
                                        <img
                                            src={zoomSrc}
                                            alt="Zoomed"
                                            style={{
                                                maxWidth: '90%',
                                                maxHeight: '90%',
                                                borderRadius: '12px'
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}


                                {(generatingGradcam || result?.gradcam_url) && (
                                    <>
                                        <div>
                                            <h2 className={styles.title}>CAM Visualization</h2>
                                            {generatingGradcam && (
                                                <p className={styles.loadingNote}>
                                                    Generating CAM. This may take up to 20 seconds
                                                    <span>{loadingDots}</span>
                                                </p>
                                            )}
                                        </div>


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

                                                        <ZoomableImage
                                                            src={ScreenImage}
                                                            alt="Brain MRI"
                                                            className={styles.gradcamImage}
                                                            attribution={
                                                                <>
                                                                    Image courtesy of Maciej Debowski, <a href="https://radiopaedia.org/cases/61691" target="_blank" rel="noopener noreferrer" style={{ color: '#ddd', textDecoration: 'underline dotted' }}>Radiopaedia.org, rID: 61691</a>
                                                                </>
                                                            }
                                                        />

                                                    </div>

                                                    <div className={styles.gradcamInfo}>
                                                        <h3>What is CAM?</h3>
                                                        <p>
                                                            CAM (Class Activation Mapping)
                                                            highlights the brain regions that most influenced the model’s prediction for this image.
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

                                                        <h4>Relevant Brain Zones</h4>
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
                                    </>
                                )}


                        {result && (
                            <div className={styles.resultBox}>
                                <div className={styles.modelDetailsBox}>
                                    <h4>Model Information</h4>
                                    <div className={styles.infoRow}>
                                        <strong>Architecture:</strong> ResNet50, 101 Ensemble
                                    </div>
                                    <div className={styles.infoRow}>
                                        <strong>Input:</strong> 256×256 MRI or Drawing
                                    </div>
                                    <div className={styles.infoRow}>
                                        <strong>Performance:</strong> MRI ~99.68%, Drawing ~100%
                                    </div>
                                    <div className={styles.infoRow} style={{ fontSize: "0.85em", color: "#555" }}>
                                        Last Updated: May 2025
                                    </div>
                                </div>


                                <div className={styles.nextStepsBox}>
                                    <h4>Suggested Next Steps for Clinicians</h4>
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

                    </div>

                )}
            </div>
        </div>
    );

};

export default ParkinsonPrediction;
