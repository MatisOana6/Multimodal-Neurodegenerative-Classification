import React, { useEffect, useState } from 'react';
import { getAllPatients } from '../../api/PatientApi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList,
    AreaChart,
    Area,
    Line,
    ComposedChart,
    Label,
    LineChart,
    PieChart,
    Pie,
    Cell,
    Treemap,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

import styles from './Dashboard.module.css';

const ALZ_SUBTYPES = ['CN', 'EMCI', 'LMCI', 'MCI', 'AD'];
const PARK_SUBTYPES = ['Control', 'Prodromal', 'SWEDD', 'PD'];

const Dashboard = () => {
    const [patients, setPatients] = useState([]);

    useEffect(() => {
        getAllPatients().then(setPatients).catch(console.error);
    }, []);

    const alzStages = {};
    ALZ_SUBTYPES.forEach(st => (alzStages[st] = 0));
    patients.forEach(p => {
        p.predictions?.forEach(pred => {
            if (pred.disease === 'alzheimer') {
                const subtype = pred.subtype || 'Unknown';
                alzStages[subtype] = (alzStages[subtype] || 0) + 1;
            }
        });
    });
    const alzStageData = ALZ_SUBTYPES.map(name => ({ name, value: alzStages[name] || 0 }));

    const parkStages = {};
    PARK_SUBTYPES.forEach(st => (parkStages[st] = 0));
    patients.forEach(p => {
        p.predictions?.forEach(pred => {
            if (pred.disease === 'parkinson') {
                const subtype = pred.subtype || 'Unknown';
                parkStages[subtype] = (parkStages[subtype] || 0) + 1;
            }
        });
    });
    const parkStageData = PARK_SUBTYPES.map(name => ({ name, value: parkStages[name] || 0 }));

    const modalityCount = {};
    patients.forEach(p => {
        p.predictions?.forEach(pred => {
            const mod = pred.modality?.toUpperCase() || 'Unknown';
            modalityCount[mod] = (modalityCount[mod] || 0) + 1;
        });
    });
    const modalityData = Object.entries(modalityCount).map(([modality, count]) => ({ modality, count }));

    const dateMap = {};
    patients.forEach(p => {
        p.predictions?.forEach(pred => {
            const date = (pred.timestamp || '').split('T')[0];
            if (!date) return;
            const dis = pred.disease?.toLowerCase();
            if (!dateMap[date]) dateMap[date] = { date, alz: 0, park: 0 };
            if (dis === 'alzheimer') dateMap[date].alz += 1;
            if (dis === 'parkinson') dateMap[date].park += 1;
        });
    });
    const timeData = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalPatients = patients.length;
    const alzPatients = patients.filter(p =>
        p.predictions?.some(pred => pred.disease === 'alzheimer')
    ).length;
    const parkPatients = patients.filter(p =>
        p.predictions?.some(pred => pred.disease === 'parkinson')
    ).length;

    return (
        <div className={styles.dashboard}>
            <h3 className={styles.title}>Medical Dashboard</h3>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total Patients</h3>
                    <p>{totalPatients}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Alzheimer Patients</h3>
                    <p>{alzPatients}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Parkinson Patients</h3>
                    <p>{parkPatients}</p>
                </div>
            </div>

            <div className={styles.chartRow}>
                <div className={styles.chartCard}>
                    <h4>Alzheimer Stages</h4>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={alzStageData} margin={{ bottom: 80, left: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                interval={0}
                                tick={{ dy: 10 }}
                            >
                                <Label value="Stages" position="insideBottom" dy={50} />
                            </XAxis>
                            <YAxis allowDecimals={false}>
                                <Label
                                    value="Number of Predictions"
                                    angle={-90}
                                    position="insideLeft"
                                    dx={-20}
                                    style={{ textAnchor: 'middle' }}
                                />
                            </YAxis>
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" name="Predictions" fill="#8884d8">
                                <LabelList dataKey="value" position="top" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={styles.chartCard}>
                    <h4>Parkinson Stages</h4>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={parkStageData} margin={{ bottom: 80, left: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                interval={0}
                                tick={{ dy: 10 }}
                            >
                                <Label value="Stages" position="insideBottom" dy={50} />
                            </XAxis>
                            <YAxis allowDecimals={false}>
                                <Label
                                    value="Number of Predictions"
                                    angle={-90}
                                    position="insideLeft"
                                    dx={-20}
                                    style={{ textAnchor: 'middle' }}
                                />
                            </YAxis>
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" name="Predictions" fill="#82ca9d">
                                <LabelList dataKey="value" position="top" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={styles.chartRow}>
                <div className={styles.chartCard}>
                    <h4>Prediction Modalities</h4>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={[...modalityData].sort((a,b) => b.count - a.count)}
                            layout="vertical"
                            margin={{ left: 70 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis
                                dataKey="modality"
                                type="category"
                                tick={{ fontSize: 14 }}
                            >
                                <Label
                                    value="Prediction Modality"
                                    angle={-90}
                                    position="insideLeft"
                                    style={{ textAnchor: 'middle' }}
                                    dx={-60}
                                />
                            </YAxis>

                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#413ea0" name="Number of Predictions">
                                <LabelList dataKey="count" position="right" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                </div>
            </div>

            <div className={styles.chartRow}>
                <div className={styles.chartCard}>
                    <h4>Predictions Over Time</h4>
                    <ResponsiveContainer width="100%" height={450}>
                        <AreaChart
                            data={timeData}
                            margin={{ top: 10, right: 40, bottom: 70, left: 60 }}
                        >
                            <defs>
                                <linearGradient id="colorAlz" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPark" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" interval="preserveEnd">
                                <Label value="Date" position="insideBottom" dy={40} />
                            </XAxis>
                            <YAxis allowDecimals={false}>
                                <Label
                                    value="Number of Predictions"
                                    angle={-90}
                                    position="insideLeft"
                                    dx={-20}
                                    style={{ textAnchor: 'middle' }}
                                />
                            </YAxis>
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip />
                            <Area
                                type="monotone"
                                dataKey="alz"
                                stroke="#8884d8"
                                fillOpacity={1}
                                fill="url(#colorAlz)"
                                name="Alzheimer"
                            />
                            <Area
                                type="monotone"
                                dataKey="park"
                                stroke="#82ca9d"
                                fillOpacity={1}
                                fill="url(#colorPark)"
                                name="Parkinson"
                            />
                        </AreaChart>
                    </ResponsiveContainer>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
