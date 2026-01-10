import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { GoogleGenAI } from "@google/genai";

const html = htm.bind(React.createElement);

// 讀取環境變量
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `你是一個專業的象棋棋盤識別助手。你的目標是將上傳的棋盤照片轉換為 FEN (Forsyth-Edwards Notation) 格式。
請嚴格遵守以下「點位優先」邏輯與「七大法則」進行校驗：
1. 9x10 網格 2. 九宮格限制 3. 過河限制 4. 字色一致 5. 數量上限 6. 王不見王 7. 士五點。
輸出格式：請只返回 JSON 格式，包含 fen 欄位及簡短的識別說明。`;

async function recognizeBoard(base64Image) {
  if (!API_KEY) {
    throw new Error("API Key 未設定，請檢查 Vercel 環境變量。");
  }

  try {
    // --- 修正版初始化 ---
    // 直接將 API_KEY 字串傳入，唔好用物件包住
    const genAI = new GoogleGenAI(API_KEY);
    
    // 攞 Model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    const prompt = `Output the Xiangqi Position in this photo and turn into Fen format. 
請分析棋盤棋局並轉換為 FEN 格式。確保輸出的 FEN 是合法且準確的。只返回 JSON 格式。`;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        // 喺呢度加入 systemInstruction，有啲版本唔支援喺 getGenerativeModel 加
        candidateCount: 1,
      }
    });

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("分析失敗：" + error.message);
  }
}

function App() {
  const [status, setStatus] = useState('IDLE');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setResult(null);
        setError(null);
        setStatus('IDLE');
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setStatus('PROCESSING');
    setError(null);
    try {
      const recognition = await recognizeBoard(image);
      setResult(recognition);
      setStatus('SUCCESS');
    } catch (err) {
      setError(err.message);
      setStatus('ERROR');
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setStatus('IDLE');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return html`
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-[#fcfaf7]">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-3xl font-bold text-red-800">象棋棋局識別助手</h1>
        <p className="text-gray-600">Gemini AI 分析版</p>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-6">
        <div className="mb-6">
          ${!image ? html`
            <div onClick=${() => fileInputRef.current?.click()} className="aspect-[4/3] border-4 border-dashed border-gray-200 rounded-2xl flex items-center justify-center cursor-pointer bg-gray-50">
              <p className="text-gray-500 font-medium">點擊上傳棋盤照片</p>
            </div>
          ` : html`
            <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden">
              <img src=${image} className="w-full h-full object-contain" />
              <button onClick=${reset} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full">✕</button>
            </div>
          `}
          <input type="file" ref=${fileInputRef} onChange=${handleImageUpload} accept="image/*" className="hidden" capture="environment" />
        </div>

        ${image && status === 'IDLE' && html`
          <button onClick=${processImage} className="w-full bg-red-700 text-white font-bold py-4 rounded-xl">開始分析</button>
        `}

        ${status === 'PROCESSING' && html`<div className="text-center py-4 text-red-700 animate-pulse">Gemini 分析中，請稍候...</div>`}

        ${status === 'SUCCESS' && result && html`
          <div className="mt-6 bg-gray-900 rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-2">FEN 結果：</h3>
            <code className="text-green-400 break-all text-sm">${result.fen}</code>
          </div>
        `}
        
        ${error && html`<div className="mt-4 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-sm">${error}</div>`}
      </main>
    </div>
  `;
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));
