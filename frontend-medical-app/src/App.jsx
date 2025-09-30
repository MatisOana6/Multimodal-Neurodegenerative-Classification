import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage.jsx";
import RegisterPage from "./pages/RegisterPage/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage/LoginPage.jsx";
import Layout from "./components/Layout/Layout.jsx";
import PredictionPage from "./pages/PredictionPage/PredictionPage.jsx";
import AlzheimerPrediction from "./pages/AlzheimerPrediction/AlzheimerPrediction.jsx";
import PatientPage from "./pages/PatientPage/PatientPage.jsx";
import Dashboard from "./components/Patients/Dashboard.jsx";
import ParkinsonPrediction from "./pages/ParkinsonPrediction/ParkinsonPrediction.jsx";
import EnsemblePrediction from "./pages/EnsemblePrediction/EnsemblePrediction.jsx";
import AudioPrediction from "./pages/AudioPrediction/AudioPrediction.jsx";


function App() {
    return (
        <Router>
            <Routes>
                <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/predict" element={<PredictionPage />} />
                <Route path="/patients" element={<PatientPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/predict/alzheimer" element={<AlzheimerPrediction />} />
                <Route path="/predict/audio" element={<AudioPrediction />} />
                <Route path="/predict/parkinson" element={<ParkinsonPrediction />} />
                <Route path="/predict/ensemble" element={<EnsemblePrediction />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
