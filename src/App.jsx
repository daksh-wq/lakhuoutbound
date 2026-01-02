import React, { useState, useEffect, useRef } from 'react';
import { Settings, Phone, PhoneOff, Activity, Volume2, X, Key, AlertCircle, ShieldCheck, FileText, Zap, Globe, Sliders } from 'lucide-react';

// --- GenArtML Configuration ---
// KEYS ARE HIDDEN: Loaded from Vercel/Vite Environment Variables
let ENV_SERVER_KEY = "";
let ENV_PASS_KEY = "";

try {
  if (import.meta && import.meta.env) {
    ENV_SERVER_KEY = import.meta.env.VITE_GENARTML_SERVER_KEY || "";
    ENV_PASS_KEY = import.meta.env.VITE_GENARTML_PASS || "";
  }
} catch (e) {
  console.warn("Env vars not loaded");
}

const MODEL_TEXT = "gemini-2.5-flash-preview-09-2025";
const MODEL_TTS = "gemini-2.5-flash-preview-tts";
const GENARTML_MODEL_TURBO = "eleven_turbo_v2_5"; 
const DEFAULT_GENARTML_VOICE_ID = "v4ZRRmjvcrgAdi5qkWtZ"; // Praveen (Male)

// --- INTELLIGENT SYSTEM PROMPT (PRAVEEN - DISHTV) ---
const REKHA_BRAIN = `
SYSTEM IDENTITY:
You are "Praveen", a senior retention specialist at "Lakhu Teleservices" (DishTV Partner).
You are intelligent but must strictly follow the specific script logic below.

CORE MESSAGE (URGENCY):
"Today is the LAST DAY. Connection will close PERMANENTLY at 6 PM. To keep it alive for the future, a small recharge of 200 Rupees is mandatory TODAY."

SCRIPT LOGIC & RESPONSES:

1. **OPENING (Always start here):**
   "Namaste, main Praveen hoon Lakhu Teleservices se. Sir, aaj aakhri din hai. Aapka DishTV connection aaj shaam 6 baje hamesha ke liye band hone ja raha hai. Isse chalu rakhne ke liye aaj hi 200 Rupees ka recharge karvana zaruri hai. Toh main connection chalu rakhun?"

2. **IF USER SAYS "TIME/LATER" (Kitne baje tak / Kal karunga):**
   -> "Sir, aaj hi recharge karva lijiye kyunki aaj connection band ho jayega toh phir kabhi chalu nahi hoga. 200 Rupees ki baat hai, abhi kar lein?"

3. **IF USER SAYS "FUTURE USE" (2-3 mahine baad chalu karunga):**
   -> "Bhavishya mein chalu karne ke liye bhi aaj 200 Rupees ka recharge karna zaruri hai, tabhi aap apni marzi se TV dekh payenge. Warna connection dead ho jayega."

4. **IF USER SAYS "OUT OF STATION" (Bahar gaon hoon):**
   -> "Sir, connection aaj band ho gaya toh wapas aane par chalu nahi hoga. Connection zinda rakhne ke liye aaj hi 200 ka recharge karva lijiye."

5. **IF USER SAYS "BROKEN TV" (TV bigad gaya hai):**
   -> "Sir, jab aap TV theek karwayenge tab connection chalu nahi hoga agar aaj band ho gaya. Connection bachane ke liye aaj 200 ka recharge kar lijiye."

6. **IF USER SAYS "EXAMS" (Bachon ki pariksha hai):**
   -> First ask: "Exam kab khatam honge?"
   -> Then say: "Sir, exam ke baad connection chalu nahi hoga agar aaj band ho gaya. Connection chalu rakhne ke liye aaj 200 ka recharge karwana zaruri hai."

7. **IF USER SAYS "NO MONEY" (Paise nahi hai):**
   -> "Sir, kahin se adjust karke aaj recharge karva lijiye, kyunki agar aaj connection band hua toh phir kabhi chalu nahi hoga. Sirf 200 Rupees ki baat hai."

8. **IF USER SAYS "CLOSE IT" (Nahi karna / Band kar do):**
   -> "Sir, connection aaj band ho jayega toh phir se chalu nahi hoga. Connection chalu rakhna hai toh aaj hi 200 ka recharge karwana zaruri hai."

9. **IF USER SAYS "NEW CONNECTION" (Jio/Airtel le liya):**
   -> "Agar naye connection mein koi problem aaye toh ye purana connection kaam aayega. Backup ke liye isse chalu rakhiye, bas aaj 200 ka recharge karna padega."

**RULES:**
- Speak natural Hindi (Hinguj allowed if user speaks Gujarati).
- Always stick to the "Connection Closes Forever at 6 PM" logic.
- Minimum amount is 200 Rupees. No offers.
`;

// --- Audio Utilities ---
const pcmToWav = (pcmData, sampleRate = 24000) => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const pcmBytes = new Uint8Array(pcmData);
  const wavBytes = new Uint8Array(buffer, 44);
  wavBytes.set(pcmBytes);

  return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// --- Components ---
const GlowingOrb = ({ state, engine }) => {
  const getColors = () => {
    switch(state) {
      case 'listening': return 'from-blue-500 to-cyan-400 shadow-blue-500/50';
      case 'processing': return engine === 'genart_turbo' ? 'from-orange-500 to-yellow-400 shadow-orange-500/50' : 'from-purple-500 to-pink-500 shadow-purple-500/50';
      case 'speaking': return 'from-emerald-500 to-teal-400 shadow-emerald-500/50';
      case 'error': return 'from-red-500 to-orange-500 shadow-red-500/50';
      default: return 'from-slate-500 to-slate-400 opacity-50';
    }
  };

  return (
    <div className="relative flex justify-center items-center">
        <div className={`absolute w-72 h-72 rounded-full bg-gradient-to-br opacity-20 blur-3xl transition-all duration-300 ${getColors()}`}></div>
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br shadow-2xl transition-all duration-300 ease-in-out z-10 ${getColors()} ${state === 'listening' ? 'scale-110 animate-pulse' : ''}`}></div>
        <div className="absolute -bottom-24 w-full text-center tracking-widest text-sm font-bold text-slate-400 uppercase animate-pulse">
           {state === 'idle' ? 'Ready' : state}
        </div>
    </div>
  );
};

export default function App() {
  const [isInCall, setIsInCall] = useState(false);
  const [state, setState] = useState('idle'); 
  const [caption, setCaption] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
  // Keys
  const [genartmlServerKey, setGenartmlServerKey] = useState(ENV_SERVER_KEY);
  const [genartmlPass, setGenartmlPass] = useState(ENV_PASS_KEY); 
  
  // Settings
  const [genartmlVoiceId, setGenartmlVoiceId] = useState(DEFAULT_GENARTML_VOICE_ID);
  const [voiceStability, setVoiceStability] = useState(0.5); // Slightly higher for Male/Professional tone
  const [voiceSimilarity, setVoiceSimilarity] = useState(0.8);
  const [inputLang, setInputLang] = useState("hi-IN");

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const silenceTimer = useRef(null);
  const currentTranscriptRef = useRef(""); 
  const messagesRef = useRef([]); 
  const audioCacheRef = useRef(new Map());
  
  const callActiveRef = useRef(false);
  const stateRef = useRef('idle');

  useEffect(() => { stateRef.current = state; }, [state]);

  const unlockAudioContext = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // --- API Functions ---
  const generateResponse = async (textInput, history) => {
    if (!genartmlServerKey) throw new Error("GenArtML Server Key Missing");

    const cleanHistory = history.filter(msg => msg.parts?.[0]?.text !== "SYSTEM_INITIATE_CALL");

    const textPayload = {
      contents: [
          ...cleanHistory, 
          { role: "user", parts: [{ text: textInput }] }
      ],
      systemInstruction: {
        parts: [{ text: REKHA_BRAIN }]
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TEXT}:generateContent?key=${genartmlServerKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textPayload)
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "...";
    return aiText.replace(/[*_]/g, '').trim(); 
  };

  const generateSpeech = async (text) => {
    const cacheKey = `${text}-${genartmlVoiceId}-${voiceStability}`;
    if (audioCacheRef.current.has(cacheKey)) {
        return audioCacheRef.current.get(cacheKey);
    }

    let audioBlob;

    if (genartmlPass && genartmlPass.length > 10) {
        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${genartmlVoiceId}?optimize_streaming_latency=4`, 
                {
                    method: 'POST',
                    headers: { 'xi-api-key': genartmlPass, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        model_id: GENARTML_MODEL_TURBO,
                        voice_settings: { stability: voiceStability, similarity_boost: voiceSimilarity }
                    })
                }
            );
            if (!response.ok) throw new Error("Voice Error");
            audioBlob = await response.blob();
        } catch(e) {
             const ttsPayload = {
                contents: [{ parts: [{ text: text }] }],
                generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } } } // Puck for Male Fallback
            };
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${genartmlServerKey}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ttsPayload)
            });
            const d = await res.json();
            const b = Uint8Array.from(atob(d.candidates[0].content.parts[0].inlineData.data), c => c.charCodeAt(0));
            audioBlob = pcmToWav(b.buffer, 24000);
        }
    } else {
         const ttsPayload = {
            contents: [{ parts: [{ text: text }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } } }
        };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_TTS}:generateContent?key=${genartmlServerKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ttsPayload)
        });
        const d = await res.json();
        const b = Uint8Array.from(atob(d.candidates[0].content.parts[0].inlineData.data), c => c.charCodeAt(0));
        audioBlob = pcmToWav(b.buffer, 24000);
    }

    audioCacheRef.current.set(cacheKey, audioBlob);
    return audioBlob;
  };

  // --- Browser Speech Logic ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false; 
      recognition.interimResults = true;
      recognition.lang = inputLang; 

      recognition.onstart = () => {
        if (callActiveRef.current && stateRef.current !== 'speaking' && stateRef.current !== 'processing') {
            setState('listening');
            setCaption("Sun raha hoon..."); 
        }
      };

      recognition.onresult = (event) => {
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) finalTranscript += event.results[i][0].transcript;
        
        const text = finalTranscript.trim();
        if (text) {
           setCaption(`"${text}"`);
           currentTranscriptRef.current = text;
           silenceTimer.current = setTimeout(() => {
               if (recognitionRef.current) recognitionRef.current.stop();
           }, 800); 
        }
      };

      recognition.onend = () => {
         if (currentTranscriptRef.current && callActiveRef.current) {
             handleInteraction(currentTranscriptRef.current);
             currentTranscriptRef.current = ""; 
         } else if (callActiveRef.current && stateRef.current !== 'processing' && stateRef.current !== 'speaking') {
             try { recognition.start(); } catch(e) {}
         }
      };
    }
  }, [inputLang]); 

  const startCall = async () => {
    setIsInCall(true);
    callActiveRef.current = true;
    messagesRef.current = [];
    currentTranscriptRef.current = "";
    unlockAudioContext();

    if (!genartmlServerKey) {
        setCaption("Error: Server Key Missing");
        setState('error');
        return;
    }

    setState('processing');
    setCaption("Connecting...");
    
    // Simulate Outbound Call Trigger
    await handleInteraction("SYSTEM_INITIATE_CALL"); 
  };

  const endCall = () => {
    setIsInCall(false);
    callActiveRef.current = false;
    setState('idle');
    setCaption("");
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  const handleInteraction = async (text) => {
    if (!callActiveRef.current) return; 

    setState('processing');
    setCaption("...");

    try {
      const isTrigger = text === "SYSTEM_INITIATE_CALL";
      
      if (!isTrigger) {
          messagesRef.current = [...messagesRef.current, { role: "user", parts: [{ text }] }];
      }

      const responseText = await generateResponse(text, messagesRef.current);
      
      messagesRef.current = [...messagesRef.current, { role: "model", parts: [{ text: responseText }] }];
      
      const audioBlob = await generateSpeech(responseText);
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        setCaption(responseText); 
        setState('speaking');
        
        await audioRef.current.play();
        
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (callActiveRef.current) {
            setState('listening');
            setCaption("Sun raha hoon...");
            try { recognitionRef.current.start(); } catch(e) {}
          }
        };
      }
    } catch (e) {
      console.error(e);
      setState('error');
      setCaption(`Error: ${e.message}`);
      setTimeout(() => {
         if (callActiveRef.current) {
             setState('listening');
             try { recognitionRef.current.start(); } catch(err){}
         }
      }, 3000);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden flex flex-col relative">
      <audio ref={audioRef} className="hidden" />

      {/* --- SETTINGS --- */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-300">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-blue-400"/> Settings</h2>
             <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X /></button>
           </div>
           
           <div className="space-y-6 max-w-md mx-auto w-full overflow-y-auto pb-20">
              <div className="space-y-2">
                 <label className="text-sm text-yellow-400 font-bold uppercase flex items-center gap-2">
                    <Key className="w-4 h-4"/> GenArtML Server Key
                 </label>
                 <input type="password" value={genartmlServerKey} onChange={(e) => setGenartmlServerKey(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-yellow-500 outline-none font-mono" />
              </div>
              <div className="space-y-2">
                 <label className="text-sm text-orange-400 font-bold uppercase flex items-center gap-2">
                    <Zap className="w-4 h-4"/> GenArtML Pass
                 </label>
                 <input type="password" value={genartmlPass} onChange={(e) => setGenartmlPass(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono" />
              </div>
              <div className="space-y-4 pt-4 border-t border-slate-700">
                 <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <Sliders className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase">Voice Modulation</span>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs text-slate-400">GenArtML Voice ID</label>
                    <input type="text" value={genartmlVoiceId} onChange={(e) => setGenartmlVoiceId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none font-mono"/>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400"><span>Stability</span><span>{voiceStability}</span></div>
                    <input type="range" min="0" max="1" step="0.05" value={voiceStability} onChange={(e) => setVoiceStability(parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"/>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400"><span>Similarity</span><span>{voiceSimilarity}</span></div>
                    <input type="range" min="0" max="1" step="0.05" value={voiceSimilarity} onChange={(e) => setVoiceSimilarity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"/>
                 </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-slate-700">
                 <label className="text-sm text-blue-400 font-bold uppercase flex items-center gap-2">
                    <Globe className="w-4 h-4"/> Input Language
                 </label>
                 <select value={inputLang} onChange={(e) => setInputLang(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" >
                    <option value="hi-IN">Hindi (hi-IN)</option>
                    <option value="gu-IN">Gujarati (gu-IN)</option>
                    <option value="en-IN">English (en-IN)</option>
                 </select>
              </div>
           </div>
        </div>
      )}

      {/* --- MAIN UI --- */}
      <div className="flex-1 flex flex-col items-center justify-between py-12 px-6 relative z-0">
        <div className="w-full max-w-md flex justify-between items-center opacity-80">
           <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isInCall ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
              <span className={`text-xs font-mono tracking-widest uppercase ${isInCall ? 'text-emerald-500' : 'text-slate-500'}`}>{isInCall ? 'Live Call' : 'Offline'}</span>
           </div>
           {!isInCall && <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-full"><Settings className="w-5 h-5 text-slate-400" /></button>}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
            {isInCall ? (
                <>
                  <GlowingOrb state={state} engine={genartmlPass ? 'genart_turbo' : 'genart_std'} />
                  <div className="mt-16 h-24 flex items-center justify-center w-full max-w-lg text-center px-4">
                     {state === 'error' && <AlertCircle className="w-6 h-6 text-red-500 mr-2" />}
                     <p className={`text-xl md:text-2xl font-light transition-all duration-300 ${state === 'processing' ? 'opacity-50 blur-[1px]' : 'opacity-100'}`}>{caption}</p>
                  </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                    <div className="w-40 h-40 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-2xl relative">
                        <Activity className="w-16 h-16 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-light tracking-tight text-white">Lakhu Teleservices</h1>
                    <p className="text-slate-500 text-center text-sm">Agent • Praveen</p>
                    {genartmlPass && <span className="text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full flex items-center gap-1"><Zap className="w-3 h-3"/> Turbo Active</span>}
                </div>
            )}
        </div>

        <div className="w-full max-w-md flex items-center justify-center gap-8">
            {isInCall ? (
                <>
                  <button onClick={() => setShowSettings(true)} className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"><Settings className="w-6 h-6" /></button>
                  <button onClick={endCall} className="p-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transform hover:scale-105 transition-all"><PhoneOff className="w-8 h-8 fill-current" /></button>
                  <button className="p-4 rounded-full bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"><Volume2 className="w-6 h-6" /></button>
                </>
            ) : (
                <button onClick={startCall} className="group relative flex items-center justify-center p-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 transition-all duration-300 transform hover:scale-110">
                  <Phone className="w-8 h-8 fill-current z-10" />
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
