import React, { useEffect, useState, useRef } from 'react';
import styles from './EnsemblePrediction.module.css';
import { getAllPatients } from '../../api/PatientApi.jsx';
import { savePrediction, predictEnsemble, getCamStatus } from '../../api/PredictionApi.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import ZoomableImage from '../../components/Image/ZoomableImage.jsx';
import AxialImage from '../../assets/axial.jpeg';
import SagittalImage from '../../assets/sagittal.jpeg';

const EnsemblePrediction = () => {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [fileType, setFileType] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingDots, setLoadingDots] = useState('');
    const [generatingGradcam, setGeneratingGradcam] = useState(false);
    const [generatingPrediction, setGeneratingPrediction] = useState(false);
    const predictionResultRef = useRef(null);
    const diseaseInfo = result?.predicted_disease?.toLowerCase() || '';

    const referenceImage = diseaseInfo.includes('alzheimer') && diseaseInfo.includes('axial')
        ? AxialImage
        : SagittalImage;

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

        const alzExplanations = {
            "frontal lobe": "This region is responsible for planning, decision-making, and social behavior. In Alzheimer’s, changes here are linked to poor judgment and impaired reasoning.",
            "temporal lobe": "Associated with memory and language. High activation may indicate early neurodegenerative signs, affecting speech and recall.",
            "parietal lobe": "Controls spatial awareness and attention. Degeneration may reflect navigation difficulties or disorientation.",
            "occipital lobe": "Processes visual information. May show changes in advanced stages affecting visual perception.",
            "hippocampus": "Central to memory formation and spatial orientation. One of the first regions affected in Alzheimer’s.",
            "occipital/parietal": "Combined involvement may reflect issues with coordination, perception, or visual-spatial reasoning.",
            "temporo-parietal": "Junction of comprehension and language processing. Often affected early, linked to confusion and understanding difficulty.",
            "posterior cingulate": "Key default mode network region, early hypoactivity suggests memory network disconnection.",
            "precuneus": "Hub for spatial processing and episodic memory. Early metabolic decline seen in Alzheimer’s progression."
        };

        const parkExplanations = {
            frontal: "Frontal lobe changes may indicate cognitive decline or executive dysfunction related to Parkinson’s progression.",
            temporal: "Temporal lobe alterations often relate to motor planning, memory, and tremor onset.",
            parietal: "Parietal involvement may be seen in atypical Parkinsonian syndromes or advanced cases.",
            occipital: "Occipital lobe changes are rare but possible in visual hallucinations or atypical cases.",
            hippocampus: "Hippocampal changes can indicate memory difficulties in later stages.",
            "occipital/parietal": "Combined occipital-parietal involvement may appear in advanced or mixed pathology cases."
        };


        const disease = (result?.predicted_disease || '').toLowerCase();
        const zoneExplanations = disease.includes('parkinson') ? parkExplanations : alzExplanations;

        return (
            <div className={styles.modelInsightBox}>
                <h4> Model Insight by Brain Region</h4>
                <p className={styles.explanationText}>
                    The model highlights brain areas based on activation levels:
                    <ul>
                        <li><strong>Average</strong> — overall importance across the entire region.</li>
                        <li><strong>Peak</strong> — the highest activation point within the region.</li>
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


                    const regionKey = region.toLowerCase();
                    const explanationEntry = Object.entries(zoneExplanations).find(([key]) =>
                        regionKey.includes(key)
                    );
                    const explanation = explanationEntry ? explanationEntry[1] : "No detailed explanation available.";

                    return (
                        <div className={styles.regionCard} key={region}>
                            <div className={styles.regionHeader}>
                                <h5>{region.charAt(0).toUpperCase() + region.slice(1)}</h5>
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
        setLoading(true);
        setGeneratingPrediction(true);
        setGeneratingGradcam(false);

        if (!file || !patientId) {
            setError('Please select a file and a patient.');
            setLoading(false);
            setGeneratingPrediction(false);
            return;
        }

        try {
            const predictionResult = await predictEnsemble(file);

            if (predictionResult.error) {
                throw new Error(predictionResult.error);
            }

            const diseaseType = predictionResult.predicted_disease?.toLowerCase().includes('parkinson')
                ? 'parkinson'
                : 'alzheimer';

            setResult(predictionResult);

            await savePrediction(
                {
                    disease: diseaseType,
                    modality: 'ensemble',
                    patientId: patientId,
                },
                predictionResult.predicted_class,
                predictionResult.score / 100
            );

            setGeneratingPrediction(false);
            setGeneratingGradcam(true);

            const checkCamStatus = async () => {
                const camData = await getCamStatus(predictionResult.prediction_id);
                if (camData.gradcam_url) {
                    setResult(prev => ({
                        ...prev,
                        gradcam_url: camData.gradcam_url,
                        activation_score: camData.activation_score,
                        region_scores: camData.region_scores,
                        activation_interpretation:
                            camData.activation_score > 0.7
                                ? "High activation: clear region highlight typical for advanced stage."
                                : camData.activation_score > 0.4
                                    ? "Moderate activation: region highlight suggests mild to moderate pathology."
                                    : "Low activation: weak highlight, possible healthy pattern or early stage."
                    }));
                    setGeneratingGradcam(false);
                    predictionResultRef.current?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    setTimeout(checkCamStatus, 2000);
                }
            };
            checkCamStatus();

        } catch (err) {
            console.error(err);
            setError(err.message || 'Prediction failed. Please try again.');
            setGeneratingPrediction(false);
            setGeneratingGradcam(false);
        } finally {
            setLoading(false);
        }

    };


    const getClassDescriptions = () => {
        const disease = result?.predicted_disease?.toLowerCase() || '';
        if (disease.includes('parkinson')) {
            return [
                { code: 'PD', name: "Parkinson’s Disease", desc: "Progressive neurodegeneration affecting basal ganglia and motor pathways. Causes tremor, rigidity, bradykinesia and mild cognitive changes." },
                { code: 'Control', name: "Healthy", desc: "No structural or functional alterations detected. Basal ganglia, cortex and motor circuits appear normal." },
                { code: 'Prodromal', name: "Early Stage", desc: "Subtle dopaminergic neuronal loss. Early stage before clear motor signs. Minor changes may appear in brainstem or frontal areas." },
                { code: 'SWEDD', name: "Atypical Parkinsonism", desc: "Clinical Parkinson-like symptoms but no dopaminergic deficit on scans. May indicate alternative diagnosis or non-classical pathology." },
            ];
        } else {
            return [
                { code: 'AD', name: "Alzheimer’s Disease", desc: "Advanced neurodegeneration involving hippocampus, temporal and parietal lobes. Leads to severe memory loss and functional decline." },
                { code: 'CN', name: "Cognitively Normal", desc: "No detectable atrophy. Normal hippocampal volume and preserved cortical function." },
                { code: 'EMCI', name: "Early Mild Cognitive Impairment", desc: "Early hippocampal atrophy and subtle entorhinal cortex changes. Subjective memory complaints but daily function mostly intact." },
                { code: 'LMCI', name: "Late Mild Cognitive Impairment", desc: "More evident hippocampal and parietal degeneration. Functional impact starts to appear." },
                { code: 'MCI', name: "Mild Cognitive Impairment", desc: "Mild medial temporal lobe decline. May remain stable or progress towards Alzheimer’s disease." },
            ];
        }
    };

    const chartData = result ? Object.entries(result.all_predictions).map(([model, [label, score]]) => ({
        model, score, label,
    })) : [];


    const getContextualInterpretation = (predictedClass, confidence, probabilities, activationZone = null) => {
        const confidenceLevel = confidence > 0.9
            ? "very strong"
            : confidence > 0.75
                ? "high"
                : confidence > 0.5
                    ? "moderate"
                    : "low";

        const disease = (result?.predicted_disease || '').toLowerCase();
        const isParkinson = disease.includes('parkinson');

        const parkDescriptions = {
            Parkinson: fileType === 'other'
                ? "The drawing indicates possible tremor, irregularity or micrographia, which are typical for Parkinson’s motor impairment."
                : "Parkinson’s Disease is a progressive neurodegenerative disorder causing tremor, rigidity and motor dysfunction due to dopamine neuron loss.",

            Healthy: fileType === 'other'
                ? "The drawing shows smooth, regular lines and curves without interruptions or shakiness, indicating healthy motor control with no signs of Parkinson’s."
                : "No clinical or imaging evidence of Parkinsonian symptoms. Brain structures appear normal.",

            PD: "Parkinson’s Disease detected via MRI analysis.",
            Control: "Healthy control brain structure on MRI.",
            Prodromal: "Early signs visible on MRI — mild symptoms and subtle changes.",
            SWEDD: "Parkinson-like symptoms without dopaminergic deficit on MRI."
        };

        const alzDescriptions = {
            AD: "Alzheimer’s Disease is a late-stage neurodegenerative condition marked by significant memory loss, impaired reasoning, and behavioral changes. Structural brain changes are usually visible on imaging.",
            CN: "Cognitively Normal (CN) individuals show no signs of neurodegeneration or memory impairment. MRI scans usually show no abnormal activations.",
            MCI: "Mild Cognitive Impairment (MCI) reflects a general early-stage decline in memory or thinking skills. It does not always progress to dementia, but requires monitoring.",
            EMCI: "Early Mild Cognitive Impairment (EMCI) includes subtle memory issues, often without impact on daily activities. This stage can precede LMCI or AD.",
            LMCI: "Late Mild Cognitive Impairment (LMCI) is a more advanced form of cognitive decline, where functional changes start to be more noticeable. It is considered a high-risk stage for Alzheimer's progression."
        };

        const classDescriptions = isParkinson ? parkDescriptions : alzDescriptions;
        const generalExplanation = classDescriptions[predictedClass] || "No general information available for this class.";

        let overlapExplanation = "";
        if (probabilities && typeof probabilities === 'object') {
            const sorted = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
            const [topClass, topScore] = sorted[0];
            const [secondClass, secondScore] = sorted[1];
            const diff = Math.abs(topScore - secondScore);

            if (diff < 0.1) {
                overlapExplanation = `The model also found similar patterns between <strong>${topClass}</strong> (${(topScore * 100).toFixed(2)}%) and <strong>${secondClass}</strong> (${(secondScore * 100).toFixed(2)}%), suggesting possible overlap.`;
                if (isParkinson && (
                    (topClass === "PD" && secondClass === "SWEDD") ||
                    (topClass === "Prodromal" && secondClass === "Control") ||
                    (topClass === "SWEDD" && secondClass === "Prodromal")
                )) {
                    overlapExplanation += ` This is typical in early or ambiguous cases of Parkinsonism.`;
                }
                if (!isParkinson && (
                    (topClass === "EMCI" && secondClass === "CN") ||
                    (topClass === "LMCI" && secondClass === "AD") ||
                    (topClass === "MCI" && secondClass === "EMCI") ||
                    (topClass === "EMCI" && secondClass === "LMCI")
                )) {
                    overlapExplanation += ` This is common in early cognitive decline stages, where brain structure changes are subtle.`;
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
            <div className={styles.leftColumn}>
                <h2 className={styles.title}>Automatic Prediction (Ensemble)</h2>
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


                    <label>Upload MRI Image:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        required
                    />

                    {previewUrl && fileType === 'image' && (
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

            <div className={styles.rightColumn} ref={predictionResultRef}>
                <h2 className={styles.title}>Prediction Result</h2>

                {generatingPrediction && (
                    <p className={styles.loadingNote}>
                        Generating prediction. Please wait...<span>{loadingDots}</span>
                    </p>
                )}

                {result && (
                    <>
                        <div className={styles.resultContainer}>
                            <div className={styles.resultLeft}>
                                <div className={styles.resultRow}>
                                    <strong>Predicted Disease:</strong>{' '}
                                    <span className={`${styles.badge} ${styles[result.predicted_disease.replace(/\s+/g, '')]}`}>
        {result.predicted_disease}
      </span>
                                </div>
                                <div className={styles.resultRow}>
                                    <strong>Predicted Class:</strong>{' '}
                                    <span className={`${styles.badge} ${styles[result.predicted_class]}`}>
        {result.predicted_class}
      </span>
                                </div>
                                <div className={styles.resultRow}>
                                    <strong>Confidence:</strong>{' '}
                                    <span className={styles.badge}>
        {result.score}%
      </span>
                                </div>
                            </div>

                            <div className={styles.classExplanationBox}>
                                <ul>
                                    {getClassDescriptions().map((c) => (
                                        <li key={c.code} style={{ color: '#000' }}>
                                            <strong>{c.code}</strong>{' '}
                                            <span className={`${styles.badge} ${styles[c.code]}`}>{c.name}</span> - {c.desc}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>


                        <div className={styles.classExplanationBox} style={{ color: '#000' }}>
                            <h4>Contextual Interpretation</h4>
                            {getContextualInterpretation(
                                result.predicted_class,
                                result.score / 100,
                                result.probabilities,
                                result.activation_zone
                            )}
                        </div>


                        <div className={styles.resultBottom}>
                            <h4>All Model Outputs</h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="model" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip formatter={(val) => `${val}%`} />
                                    <Bar dataKey="score" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>

                            {result?.probabilities && (
                                <div className={styles.probTableWrapper}>
                                    <h4>Class Probabilities</h4>
                                    <table className={styles.probTable}>
                                        <thead>
                                        <tr>
                                            <th>Class</th>
                                            <th>Probability</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {Object.entries(result.probabilities)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([label, prob]) => (
                                                <tr key={label}>
                                                    <td>{label}</td>
                                                    <td>{(prob * 100).toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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

                                                    {referenceImage && (
                                                        <div className={styles.gradcamImageContainer}>
                                                            <ZoomableImage
                                                                src={referenceImage}
                                                                alt="Reference Brain MRI"
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

                                            <div className={styles.resultBox}>
                                                <div className={styles.modelDetailsBox}>
                                                    <h4>Model Information</h4>
                                                    <div className={styles.infoRow}>
                                                        <strong>Architecture:</strong> ResNet50, 101 Ensemble
                                                    </div>
                                                    <div className={styles.infoRow}>
                                                        <strong>Input:</strong> 256×256 MRI
                                                    </div>
                                                    <div className={styles.infoRow}>
                                                        <strong>Performance:</strong> MRI ~97.59%
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
                                        </div>
                                    )}
                                </>
                            )}

                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EnsemblePrediction;
