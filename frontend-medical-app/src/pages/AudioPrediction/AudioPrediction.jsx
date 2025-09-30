import React, { useEffect, useRef, useState, useMemo } from 'react';
import styles from './AudioPrediction.module.css';
import { predictAlzheimer, savePrediction } from '../../api/PredictionApi.jsx';
import { getAllPatients } from '../../api/PatientApi.jsx';
import ZoomableImage from '../../components/Image/ZoomableImage.jsx';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart} from 'recharts';

const AudioPrediction = () => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [result, setResult] = useState(null);
    const [delayedResult, setDelayedResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingDots, setLoadingDots] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientId, setPatientId] = useState('');
    const [, setGeneratingSpectrogram] = useState(false);
    const [error, setError] = useState('');
    const predictionResultRef = useRef(null);
    const [isWaiting, setIsWaiting] = useState(false);

    useEffect(() => {
        let interval;
        if (isWaiting) {
            interval = setInterval(() => {
                setLoadingDots((prev) => (prev === '........' ? '' : prev + '.'));
            }, 500);
        } else {
            setLoadingDots('');
        }
        return () => clearInterval(interval);
    }, [isWaiting]);


    useEffect(() => {
        getAllPatients().then(setPatients).catch(console.error);
    }, []);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setFile(selected);
        if (selected) {
            setPreviewUrl(URL.createObjectURL(selected));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setDelayedResult(null);
        setLoading(true);
        setGeneratingSpectrogram(true);
        setIsWaiting(true);

        if (!file || !patientId) {
            setError('Please select a file and a patient.');
            setLoading(false);
            setIsWaiting(false);
            return;
        }

        try {
            let predictionResult = await predictAlzheimer(file, 'audio');
            if (typeof predictionResult === 'string') {
                predictionResult = JSON.parse(predictionResult);
            }

            setResult(predictionResult);

            const subtype = predictionResult?.predicted_class;
            const confidence = predictionResult?.confidence;

            if (!subtype || confidence === undefined) {
                throw new Error('Missing prediction subtype or confidence');
            }

            await savePrediction(
                { disease: 'alzheimer', modality: 'audio', patientId },
                subtype,
                confidence
            );

            setTimeout(() => {
                setGeneratingSpectrogram(false);
                setDelayedResult(predictionResult);
                setIsWaiting(false);
                predictionResultRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 5000);

        } catch (err) {
            console.error(err);
            setError('Prediction failed. Please try again.');
            setIsWaiting(false);
        } finally {
            setLoading(false);
        }
    };


    const detailedInterpretation = useMemo(() => {
        if (!result) return '';

        const sd = result?.pitch_stats?.sd ?? 0;
        const jumps = result?.pitch_stats?.jumps ?? 0;
        const variance = result?.energy_stats?.variance ?? 0;
        const pauses = result?.energy_stats?.pauses ?? 0;

        const sdLevel = sd < 50 ? 'very low' : sd < 80 ? 'low' : sd < 130 ? 'moderate' : 'high';
        const jumpsLevel = jumps === 0 ? 'none' : jumps < 4 ? 'few' : jumps < 10 ? 'some' : 'frequent';
        const varianceLevel = variance < 50000 ? 'very low' : variance < 200000 ? 'low' : variance < 1000000 ? 'moderate' : 'high';
        const pausesLevel = pauses === 0 ? 'none' : pauses < 3 ? 'few' : 'frequent';

        const pitchDesc = {
            'very low': 'Very narrow pitch variation — could indicate a flat or monotone tone.',
            'low': 'Low pitch variation — mild rigidity in speech melody.',
            'moderate': 'Moderate pitch variation — typical for normal fluent speech.',
            'high': 'Wide pitch variation — may reflect expressive speech or mild instability.'
        }[sdLevel];

        const jumpsDesc = {
            'none': 'No pitch jumps — smooth and stable voice flow.',
            'few': 'Few pitch jumps — mostly stable with occasional small changes.',
            'some': 'Some pitch jumps — may suggest mild tremor or control variations.',
            'frequent': 'Frequent pitch jumps — could be a sign of vocal instability or tremor.'
        }[jumpsLevel];

        const varianceDesc = {
            'very low': 'Very flat energy — could mean soft or monotone speech.',
            'low': 'Low energy variation — mild loudness uniformity.',
            'moderate': 'Moderate energy variation — typical dynamic loudness.',
            'high': 'High energy variation — expressive or slightly inconsistent loudness.'
        }[varianceLevel];

        const pausesDesc = {
            'none': 'No silent pauses — continuous speech flow.',
            'few': 'Few pauses — typical for fluent speaking.',
            'frequent': 'Frequent pauses — may reflect hesitations or natural thinking breaks.'
        }[pausesLevel];

        const classIntro = (() => {
            if (delayedResult?.predicted_class?.includes('Parkinson'))
                return 'These voice features may be consistent with patterns seen in Parkinson’s speech:';
            if (delayedResult?.predicted_class?.includes('Alzheimer'))
                return 'These traits may reflect characteristics sometimes observed in Alzheimer’s speech:';
            return 'These traits indicate general speech patterns:';
        })();

        return (
            <div className={styles.detailedInterpretation}>
                <h3 className={styles.interpretationTitle}>
                    {delayedResult?.predicted_class?.replace('_', ' ') || 'Speech Analysis'}
                </h3>
                <p className={styles.interpretationIntro}>{classIntro}</p>
                <ul className={styles.interpretationList}>
                    <li><strong>Pitch SD:</strong> {sd.toFixed(2)} Hz — {pitchDesc}</li>
                    <li><strong>Pitch Jumps:</strong> {jumps} — {jumpsDesc}</li>
                    <li><strong>Energy Variance:</strong> {variance.toFixed(2)} — {varianceDesc}</li>
                    <li><strong>Silent Pauses:</strong> {pauses} — {pausesDesc}</li>
                </ul>
                <p style={{ fontSize: '0.85em', color: '#777', marginTop: '10px' }}>
                    Note: These voice features are supportive indicators only. Always interpret results in conjunction with clinical evaluation and other tests.
                </p>
            </div>
        );
    }, [result, delayedResult]);


    return (
        <div className={styles.pageWrapper}>
            <div className={styles.column}>
                <h2>Audio Prediction</h2>
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


                    <label>Upload Audio File:</label>
                    <input type="file" accept="audio/*" onChange={handleFileChange} required />

                    {previewUrl && (
                        <div className={styles.previewBox}>
                            <audio controls className={styles.previewAudio}>
                                <source src={previewUrl} />
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Predicting...' : 'Predict'}
                    </button>
                    {error && <p className={styles.error}>{error}</p>}
                </form>
            </div>

            <div className={styles.column}>
                <h2>Prediction Result</h2>
                {isWaiting && (
                    <p className={styles.loadingNote}>
                        Generating prediction<span>{loadingDots}</span>
                    </p>
                )}


                {delayedResult && (
                    <div ref={predictionResultRef} className={styles.resultBox}>
                        <p><strong>Predicted Class:</strong> <span className={`${styles.badge} ${styles[delayedResult.predicted_class.toLowerCase()]}`}>{delayedResult.predicted_class}</span></p>
                        <p><strong>Confidence:</strong> {(delayedResult.confidence * 100).toFixed(2)}%</p>

                        <div className={styles.classDescriptions}>
                            <h4>Class Descriptions:</h4>
                            <ul>
                                <li>
                                    <strong>Alzheimer:</strong> Characterized by <em>hesitant, fragmented speech</em> with longer and more frequent pauses, uneven loudness, and occasional loss of clarity. Often shows reduced articulation precision and interruptions in speech flow.
                                </li>
                                <li>
                                    <strong>Parkinson:</strong> Typically exhibits a <em>monotone voice</em> with noticeable tremor or jitter in pitch. Speech may be softer, less dynamic, and have irregular rhythm. Pitch instability can occur, with sudden minor jumps or flat segments.
                                </li>
                                <li>
                                    <strong>Healthy:</strong> Displays <em>natural pitch variation</em>, steady loudness, clear pronunciation, and fluent flow without unnecessary breaks. Indicates normal vocal control, expressive intonation, and stable speech rhythm.
                                </li>
                            </ul>
                        </div>


                        {result?.spectrogram_url && (
                            <div className={styles.spectrogramSection}>
                                <div className={styles.spectrogramCard}>
                                    <h3>Spectrogram Visualization</h3>
                                    <ZoomableImage src={`http://localhost:8001${result.spectrogram_url}`} alt="Audio Spectrogram" className={styles.spectrogramImage} />
                                    <div className={styles.legendHowtoContainer}>
                                        <div className={styles.spectrogramLegend}>
                                            <h4>Color Legend (Magma Palette)</h4>
                                            <div className={styles.legendRow}><span className={styles.colorBox} style={{ backgroundColor: '#000004' }}></span>Very low energy (silence)</div>
                                            <div className={styles.legendRow}><span className={styles.colorBox} style={{ backgroundColor: '#3B0F70' }}></span>Low intensity (soft voice)</div>
                                            <div className={styles.legendRow}><span className={styles.colorBox} style={{ backgroundColor: '#8C2981' }}></span>Moderate energy (normal speech)</div>
                                            <div className={styles.legendRow}><span className={styles.colorBox} style={{ backgroundColor: '#FB9F3A' }}></span>High energy (clear formants)</div>
                                            <div className={styles.legendRow}><span className={styles.colorBox} style={{ backgroundColor: '#FCFDBF' }}></span>Peak energy (loudest parts)</div>
                                        </div>
                                        <div className={styles.howToRead}>
                                            <h4>How to read a spectrogram:</h4>
                                            <p>
                                                A spectrogram visualizes how the <strong>energy</strong> and <strong>frequency</strong> of the voice change over time.
                                                Brighter bands show stronger sound at certain pitches.
                                            </p>
                                            <ul>
                                                <li><strong>Bright bands</strong>: clear and strong voice</li>
                                                <li><strong>Gaps</strong>: pauses or silent segments</li>
                                                <li><strong>Flicker/Jitter</strong>: signs of tremor or vocal instability</li>
                                                <li><strong>Weak scattered bands</strong>: hesitant or unclear speech</li>
                                            </ul>
                                        </div>

                                    </div>
                                </div>

                                <div className={styles.detailedInterpretation}>
                                    {detailedInterpretation}
                                </div>

                                <div className={styles.extraChartsSection}>
                                    <h3>Additional Signal Insights</h3>
                                    <div className={styles.chartsWrapper}>
                                        <div className={styles.chartCard}>
                                            <h4>Energy Contour</h4>
                                            <p className={styles.explanationEnergy}>
                                                <strong>Energy Variation:</strong>
                                                <span className={styles.peaks}>peaks -</span>mean strong segments,
                                                <span className={styles.drops}>drops -</span>show hesitations.
                                            </p>

                                            <ResponsiveContainer width="100%" height={220}>
                                                <AreaChart
                                                    data={result.energy_contour.map((val, idx) => ({ idx, val }))}
                                                    margin={{ top: 20, right: 30, left: 50, bottom: 40 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="idx"
                                                        label={{ value: "Frame Index", position: "insideBottom", dy: 30 }}
                                                    />
                                                    <YAxis
                                                        label={{
                                                            value: "Energy",
                                                            angle: -90,
                                                            position: "insideLeft",
                                                            dx: -30,
                                                            style: { textAnchor: "middle" },
                                                        }}
                                                    />
                                                    <Tooltip />
                                                    <defs>
                                                        <linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#FF6600" stopOpacity={0.7} />
                                                            <stop offset="50%" stopColor="#FF3333" stopOpacity={0.5} />
                                                            <stop offset="100%" stopColor="#FF3333" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Area
                                                        type="monotone"
                                                        dataKey="val"
                                                        stroke="#FF6600"
                                                        strokeWidth={1}
                                                        fill="url(#energyFill)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>

                                        </div>

                                        <div className={styles.chartCard}>
                                            <h4>Pitch Contour</h4>
                                            <p className={styles.explanationPitch}>
                                                <strong>Pitch Flow: </strong>
                                                <span className={styles.smooth}>smooth -</span> means healthy prosody,
                                                <span className={styles.jumps}>jumps -</span>signal tremor or instability.
                                            </p>

                                            <ResponsiveContainer width="100%" height={220}>
                                                <AreaChart
                                                    data={result.pitch_contour.map((val, idx) => ({ idx, val }))}
                                                    margin={{ top: 20, right: 30, left: 50, bottom: 40 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="idx"
                                                        label={{ value: "Frame Index", position: "insideBottom", dy: 30 }}
                                                    />
                                                    <YAxis
                                                        label={{
                                                            value: "Pitch (Hz)",
                                                            angle: -90,
                                                            position: "insideLeft",
                                                            dx: -30,
                                                            style: { textAnchor: "middle" }
                                                        }}
                                                    />
                                                    <Tooltip />
                                                    <defs>
                                                        <linearGradient id="pitchFill" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8C2981" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#8C2981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Area
                                                        type="monotone"
                                                        dataKey="val"
                                                        stroke="#8C2981"
                                                        strokeWidth={1.0}
                                                        fill="url(#pitchFill)"
                                                    />

                                                </AreaChart>
                                            </ResponsiveContainer>


                                        </div>
                                    </div>
                                </div>
                                <div className={styles.resultBox}>
                                    <div className={styles.modelDetailsBox}>
                                        <h4>Model Information</h4>
                                        <div className={styles.infoRow}>
                                            <strong>Architecture:</strong> ResNet18
                                        </div>
                                        <div className={styles.infoRow}>
                                            <strong>Input:</strong> Audio
                                        </div>
                                        <div className={styles.infoRow}>
                                            <strong>Performance:</strong> Audio and Spectogram ~97.64%
                                        </div>
                                        <div className={styles.infoRow} style={{ fontSize: "0.85em", color: "#555" }}>
                                            Last Updated: May 2025
                                        </div>
                                    </div>
                                    <div className={styles.nextStepsBox}>
                                        <h4>Suggested Next Steps for Clinicians</h4>
                                        <ul className={styles.stepsList}>
                                            <li>
                                                Review MRI manually and compare with historical scans if available.
                                            </li>
                                            <li>
                                                Correlate with clinical symptoms and cognitive testing (e.g. MMSE,
                                                MoCA).
                                            </li>
                                            <li>
                                                Recommend follow-up MRI or advanced imaging (e.g. PET scan) if
                                                confidence is moderate.
                                            </li>
                                            <li>
                                                Refer to neurology or memory clinic for multidisciplinary
                                                assessment.
                                            </li>
                                            <li>Use prediction as complementary evidence - not a standalone diagnostic.</li>
                                        </ul>
                                    </div>
                                </div>

                            </div>
                        )}

                    </div>


                )}

            </div>

        </div>
    );
};

export default AudioPrediction;
