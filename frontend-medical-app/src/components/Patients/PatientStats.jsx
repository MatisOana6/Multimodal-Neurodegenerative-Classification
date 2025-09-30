import React from 'react';
import { Line } from 'react-chartjs-2';
import { Info } from 'lucide-react';

const orderAlz = ['CN', 'EMCI', 'MCI', 'LMCI', 'AD'];
const orderPark = ['Control', 'Prodromal', 'SWEDD', 'PD'];

const legendAlz = [
    { level: 0, label: 'CN — Cognitively Normal' },
    { level: 1, label: 'EMCI — Early Mild Cognitive Impairment' },
    { level: 2, label: 'MCI — Mild Cognitive Impairment' },
    { level: 3, label: 'LMCI — Late Mild Cognitive Impairment' },
    { level: 4, label: 'AD — Alzheimer’s Disease' },
];

const legendPark = [
    { level: 0, label: 'Control — Healthy' },
    { level: 1, label: 'Prodromal — Early signs' },
    { level: 2, label: 'SWEDD — Scan Without Evidence of Dopaminergic Deficit' },
    { level: 3, label: 'PD — Parkinson’s Disease' },
];

const PatientStats = ({ predictions }) => {
    if (!predictions || predictions.length === 0) return null;

    const alz = predictions.filter((p) => {
        if (['mri_axial', 'mri_sagittal', 'ensemble'].includes(p.modality)) return true;
        if (p.modality === 'audio') {
            const subtype = p.subtype?.toLowerCase() || '';
            return subtype === 'healthy' || subtype === 'alzheimer';
        }
        return false;
    });

    const park = predictions.filter((p) => {
        if (p.modality.startsWith('mri')) return true;
        if (p.modality === 'drawing') return true;
        if (p.modality === 'audio') return true;
        return false;
    });

    const buildChart = (data, order, title, legend) => {
        if (data.length === 0) return null;

        const uniquePerDay = new Map();
        data.forEach((p) => {
            const d = new Date(p.timestamp);
            const dayKey = d.toISOString().split('T')[0];

            let subtype = p.subtype || '';
            subtype = subtype.trim();

            if (p.modality === 'audio' || p.modality === 'drawing') {
                const s = subtype.toLowerCase();
                if (title === 'Alzheimer') {
                    if (s === 'healthy') subtype = 'CN';
                    else if (s === 'alzheimer') subtype = 'AD';
                } else if (title === 'Parkinson') {
                    if (s === 'healthy') subtype = 'Control';
                    else if (s === 'parkinson') subtype = 'PD';
                }
            }

            const upper2 = subtype.toUpperCase();
            if (['PD', 'CN', 'AD', 'EMCI', 'MCI', 'LMCI', 'CONTROL', 'PRODROMAL'].includes(upper2)) {
                if (upper2 === 'CONTROL') subtype = 'Control';
                else if (upper2 === 'PRODROMAL') subtype = 'Prodromal';
                else subtype = upper2;
            } else if (upper2 === 'SWEDD') {
                subtype = 'SWEDD';
            } else {
                subtype = subtype.charAt(0).toUpperCase() + subtype.slice(1).toLowerCase();
            }


            if (p.modality === 'audio') {
                const s = subtype.toLowerCase();
                if (title === 'Alzheimer') {
                    if (s === 'healthy') subtype = 'CN';
                    if (s === 'alzheimer') subtype = 'AD';
                }
                if (title === 'Parkinson') {
                    if (s === 'healthy') subtype = 'Control';
                    if (s === 'parkinson') subtype = 'PD';
                }
            }

            if (p.modality === 'drawing') {
                const s = subtype.toLowerCase();
                if (s === 'healthy') subtype = 'Control';
                if (s === 'parkinson') subtype = 'PD';
            }

            if (!order.includes(subtype)) subtype = order[0];

            if (
                !uniquePerDay.has(dayKey) ||
                new Date(p.timestamp) > uniquePerDay.get(dayKey).timestamp
            ) {
                uniquePerDay.set(dayKey, {
                    timestamp: new Date(p.timestamp),
                    subtype,
                    confidence: p.confidence * 100,
                });
            }
        });


        const timeline = Array.from(uniquePerDay.values()).sort(
            (a, b) => a.timestamp - b.timestamp
        );

        const chartData = {
            labels: timeline.map((t) => {
                const d = t.timestamp;
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
                    .toString()
                    .padStart(2, '0')}/${d.getFullYear()}`;
            }),
            datasets: [
                {
                    label: `${title} Subtype`,
                    data: timeline.map((t) => {
                        const idx = order.indexOf(t.subtype);
                        return idx === -1 ? 0 : idx;
                    }),
                    tension: 0.35,
                    borderColor: title === 'Alzheimer' ? '#1976d2' : '#388e3c',
                    borderWidth: 2.5,
                    pointBackgroundColor: timeline.map((t) =>
                        t.subtype === 'AD' || t.subtype === 'PD'
                            ? '#d32f2f'
                            : title === 'Alzheimer'
                                ? '#0288d1'
                                : '#43a047'
                    ),
                    pointRadius: 6,
                    fill: true,
                    backgroundColor: (ctx) => {
                        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(
                            0,
                            title === 'Alzheimer'
                                ? 'rgba(25, 118, 210, 0.2)'
                                : 'rgba(56, 142, 60, 0.2)'
                        );
                        gradient.addColorStop(1, 'rgba(255,255,255,0)');
                        return gradient;
                    },
                },
            ],
        };

        return (
            <div style={{ marginBottom: '3rem' }}>
                <p
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#555',
                        marginBottom: '0.5rem',
                    }}
                >
                    <Info size={18} /> Subtype evolution for {title} (latest per day).
                </p>
                <div style={{ height: '450px' }}>
                    <Line
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                title: {
                                    display: true,
                                    text: `${title} Subtype Shift Over Time`,
                                    font: { size: 18 },
                                },
                            },
                            scales: {
                                y: {
                                    suggestedMin: 0,
                                    suggestedMax: order.length - 1,
                                    ticks: {
                                        stepSize: 1,
                                        callback: (v) => order[v] || '',
                                    },
                                    title: {
                                        display: true,
                                        text: 'Subtype',
                                    },
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Date',
                                    },
                                    ticks: {
                                        maxRotation: 40,
                                        minRotation: 30,
                                    },
                                },
                            },
                        }}
                    />
                </div>

                <div
                    style={{
                        marginTop: '1rem',
                        background: '#f8f9fa',
                        padding: '1rem',
                        borderRadius: '8px',
                    }}
                >
                    <strong>Subtype Levels:</strong>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
                        {legend.map((item) => (
                            <li key={item.level} style={{ marginBottom: '0.2rem' }}>
                                <strong>{item.level}:</strong> {item.label}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    return (
        <div>
            {buildChart(alz, orderAlz, 'Alzheimer', legendAlz)}
            {buildChart(park, orderPark, 'Parkinson', legendPark)}
        </div>
    );
};

export default PatientStats;
