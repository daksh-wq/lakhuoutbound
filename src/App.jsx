import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  doc
} from 'firebase/firestore';
import { 
  Terminal, 
  Upload, 
  Cpu, 
  Activity, 
  Database, 
  Clock, 
  FileSpreadsheet, 
  CheckCircle, 
  Loader2,
  Server,
  Zap,
  Lock,
  X,
  AlertTriangle,
  ShieldCheck,
  Building2
} from 'lucide-react';

// --- Firebase Configuration (Provided by User) ---
const firebaseConfig = {
  apiKey: "AIzaSyAlXi4CSvr07HTbu_bV4EGO59MXVjmHf54",
  authDomain: "lakhuteleservices-1f9e0.firebaseapp.com",
  projectId: "lakhuteleservices-1f9e0",
  storageBucket: "lakhuteleservices-1f9e0.firebasestorage.app",
  messagingSenderId: "855678452910",
  appId: "1:855678452910:web:b0347ec8dfd710104c593f",
  measurementId: "G-K12ZEMY8KK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use a static App ID for data organization within the DB
const APP_ID = 'llm-trainer-dashboard';

// --- Helper Functions ---

const formatDuration = (ms) => {
  if (ms <= 0) return "00:00:00";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getRandomTrainingTime = () => {
  // Random duration between 4 and 19 hours in milliseconds
  const minHours = 4;
  const maxHours = 19;
  const hours = Math.random() * (maxHours - minHours) + minHours;
  return hours * 60 * 60 * 1000;
};

// --- Components ---

const TerminalLog = () => {
  const [logs, setLogs] = useState([]);
  const endRef = useRef(null);

  const logMessages = [
    "Allocating tensors...",
    "Optimizing gradients...",
    "Loading shards...",
    "Verifying Excel schema...",
    "Tokenizing input data...",
    "Backpropagating errors...",
    "Updating weights...",
    "Garbage collection...",
    "Calculating loss...",
    "Syncing with TPU cluster...",
    "Fetching batch #4092...",
    "Normalizing vectors...",
    "Checkpoint saved.",
    "CUDA cores active: 100%",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
      const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
      const newLog = `[${timestamp}] INFO: ${msg} [loss: ${(Math.random()).toFixed(4)}]`;
      
      setLogs(prev => {
        const updated = [...prev, newLog];
        if (updated.length > 20) updated.shift(); // Keep last 20 logs
        return updated;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-black/90 border border-green-500/30 rounded-lg p-4 font-mono text-xs md:text-sm h-64 overflow-hidden flex flex-col shadow-[0_0_15px_rgba(0,255,0,0.1)]">
      <div className="flex items-center gap-2 text-green-500 mb-2 border-b border-green-500/20 pb-2">
        <Terminal size={14} />
        <span className="uppercase tracking-widest font-bold">System Kernel Output</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
        {logs.map((log, i) => (
          <div key={i} className="text-green-400/80 truncate">
            <span className="text-green-600 mr-2">{'>'}</span>
            {log}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color = "green" }) => (
  <div className="bg-slate-900/80 border border-slate-700/50 p-4 rounded-lg flex items-center justify-between shadow-lg backdrop-blur-sm">
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl md:text-2xl font-bold text-${color}-400 font-mono`}>{value}</p>
    </div>
    <div className={`p-3 rounded-full bg-${color}-500/10`}>
      <Icon size={20} className={`text-${color}-400`} />
    </div>
  </div>
);

const ScriptItem = ({ script }) => {
  const [timeLeft, setTimeLeft] = useState("Calculating...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const end = script.trainingEndTime;
      const totalDuration = end - script.startTime;
      const remaining = end - now;

      if (remaining <= 0) {
        setTimeLeft("Complete");
        setProgress(100);
        return true; // Indicates finished
      }

      setTimeLeft(formatDuration(remaining));
      const elapsed = totalDuration - remaining;
      const percent = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(percent);
      return false; // Not finished
    };

    // Initialize state immediately
    if (script.status !== 'training') {
        setProgress(100);
        setTimeLeft("Complete");
        return;
    }

    // Run once immediately to avoid 1s delay on load
    const isFinished = updateTimer();
    if (isFinished) return;

    const interval = setInterval(() => {
        const finished = updateTimer();
        if (finished) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [script]);

  return (
    <div className="bg-slate-800/50 border border-slate-700 hover:border-green-500/30 transition-all rounded-lg p-4 mb-3 group relative overflow-hidden">
      {/* Animated scanline effect on hover */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-green-500/5 to-transparent -translate-x-full group-hover:animate-scan" />
      
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${script.status === 'training' ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
            <FileSpreadsheet size={20} className={script.status === 'training' ? 'text-amber-400' : 'text-green-400'} />
          </div>
          <div>
            <h4 className="text-slate-200 font-medium truncate max-w-[200px]">{script.fileName}</h4>
            <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
              ID: {script.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
            script.status === 'training' 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {script.status === 'training' ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
            {script.status.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>Progress</span>
          <span>{script.status === 'training' ? timeLeft : 'Deployed'}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${script.status === 'training' ? 'bg-amber-500' : 'bg-green-500'}`}
            style={{ width: `${script.status === 'training' ? progress : 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const SuccessPopup = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-green-500/50 rounded-xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(34,197,94,0.2)] relative animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/50">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">File Uploaded to Server</h2>
          <p className="text-green-400 font-mono text-sm">Initialization Protocol Complete</p>
        </div>

        <div className="space-y-4 bg-slate-950/50 rounded-lg p-4 border border-slate-800 font-mono text-sm">
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-500">Dataset:</span>
            <span className="text-slate-200 truncate max-w-[200px]">{data.fileName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500">Size:</span>
             <span className="text-slate-200">{(data.fileSize / 1024).toFixed(2)} KB</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500">Est. Training Time:</span>
             <span className="text-amber-400">{formatDuration(data.trainingDuration)}</span>
          </div>
           <div className="flex justify-between border-b border-slate-800 pb-2">
             <span className="text-slate-500">Model Arch:</span>
             <span className="text-slate-200">{data.modelType}</span>
          </div>
           <div className="flex justify-between">
             <span className="text-slate-500">Parameters:</span>
             <span className="text-slate-200">{data.parameters}</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-medium py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2"
        >
          <Zap size={18} />
          INITIATE TRAINING SEQUENCE
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [firestoreError, setFirestoreError] = useState(null);
  const fileInputRef = useRef(null);

  // 1. Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch((err) => console.error("Auth failed:", err));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listener
  useEffect(() => {
    if (!user) return;

    // RULE 1: Specific path structure
    const q = query(
      collection(db, 'artifacts', APP_ID, 'users', user.uid, 'scripts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setFirestoreError(null); // Clear previous errors if successful
        const loadedScripts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setScripts(loadedScripts);
      },
      (error) => {
        console.error("Firestore Error:", error);
        if (error.code === 'permission-denied') {
          setFirestoreError("Permission Denied: Please update Firestore Security Rules in Firebase Console.");
        } else {
          setFirestoreError(error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 3. File Upload Handler
  const handleFiles = async (files) => {
    if (!user || !files.length) return;
    setUploading(true);
    setFirestoreError(null);

    try {
      const file = files[0];
      // Simulate "Uploading to Server" delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const trainingDuration = getRandomTrainingTime();
      const startTime = Date.now();
      const trainingEndTime = startTime + trainingDuration;
      
      const newScriptData = {
        fileName: file.name,
        fileSize: file.size,
        status: 'training',
        createdAt: serverTimestamp(),
        startTime: startTime,
        trainingEndTime: trainingEndTime,
        modelType: "Transformer-XL",
        parameters: "7B",
        trainingDuration: trainingDuration // Passed for popup display only
      };

      await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'scripts'), newScriptData);
      
      // Show the popup with the data we just generated
      setPopupData(newScriptData);

    } catch (err) {
      console.error("Upload failed", err);
      if (err.code === 'permission-denied') {
        setFirestoreError("Upload Failed: Permission Denied. Check Firestore Rules.");
      } else {
        setFirestoreError("Upload Failed: " + err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 font-sans selection:bg-green-500/30 selection:text-green-200 relative">
      
      {/* Background Grid & Ambience */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,18,20,0.9),rgba(10,10,12,1)),url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      <SuccessPopup data={popupData} onClose={() => setPopupData(null)} />

      {/* Main Layout */}
      <div className="relative max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col h-screen">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-slate-800 relative">
           {/* Error Banner */}
          {firestoreError && (
            <div className="absolute -top-4 left-0 right-0 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm z-50">
              <AlertTriangle size={16} />
              {firestoreError}
            </div>
          )}

          <div className="flex items-center gap-4 mt-8 md:mt-0">
            <div className="p-3 bg-green-500/20 rounded-xl border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <Building2 size={28} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 uppercase">
                Lakhu Teleservices _ Trainer 
                <span className="text-xs px-2 py-0.5 rounded border border-green-500/30 text-green-400 bg-green-500/10">v4.0.2</span>
              </h1>
              <p className="text-slate-500 text-sm font-mono flex items-center gap-2">
                 <ShieldCheck size={14} className="text-green-500" />
                 Internal AI Model Fine-Tuning Environment
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-6 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              SYSTEM ONLINE
            </div>
            <div className="flex items-center gap-2">
              <Server size={14} />
              us-central1-a
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Lock size={14} />
              {user ? `UID: ${user.uid.slice(0,6)}...` : 'CONNECTING...'}
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Metrics & Terminal */}
          <div className="space-y-6 flex flex-col">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Active GPUs" value="128" icon={Cpu} color="green" />
              <MetricCard label="Training Jobs" value={scripts.filter(s => s.status === 'training').length} icon={Activity} color="amber" />
              <MetricCard label="VRAM Usage" value="94%" icon={Zap} color="red" />
              <MetricCard label="Est. Time" value="~12h" icon={Clock} color="blue" />
            </div>
            
            <div className="flex-1 flex flex-col">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Live System Logs</h3>
              <TerminalLog />
            </div>
          </div>

          {/* RIGHT COLUMN: Upload & Job List */}
          <div className="lg:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col overflow-hidden backdrop-blur-sm">
            
            {/* Upload Area */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/80">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 transition-all duration-300 text-center cursor-pointer group ${
                  isDragging 
                    ? 'border-green-500 bg-green-500/10 scale-[0.99]' 
                    : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx,.xls,.csv" 
                  onChange={(e) => handleFiles(e.target.files)}
                />
                
                <div className="flex flex-col items-center gap-4">
                  <div className={`p-4 rounded-full transition-transform duration-500 ${uploading ? 'bg-amber-500/20 rotate-180' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                    {uploading ? (
                      <Loader2 size={32} className="text-amber-500 animate-spin" />
                    ) : (
                      <Upload size={32} className="text-slate-400 group-hover:text-green-400 transition-colors" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-200">
                      {uploading ? 'Initializing Upload Protocol...' : 'Drop Training Scripts Here'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Supports .xlsx, .xls, .csv master datasets
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Job List */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-900/30">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center justify-between">
                <span className="uppercase tracking-wider">Training Queue</span>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-500">{scripts.length} Total</span>
              </h3>
              
              {scripts.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-600 italic border border-dashed border-slate-800 rounded-lg">
                  No active training sequences initiated.
                </div>
              ) : (
                <div className="space-y-2">
                  {scripts.map((script) => (
                    <ScriptItem key={script.id} script={script} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-slate-600 font-mono">
           Lakhu Teleservices Confidential © 2025 • Authorized Personnel Only
        </div>
      </div>
    </div>
  );
}