import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { GoogleGenAI, Type } from "@google/genai";

const html = htm.bind(React.createElement);

// --- 關鍵修改：由環境變量讀取 API Key ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `你是一個專業的象棋棋盤識別助手。你的目標是將上傳的棋盤照片轉換為 FEN (Forsyth-Edwards Notation) 格式。
請嚴格遵守以下「點位優先」邏輯與「七大法則」進行校驗：
1. 9x10 網格 2. 九宮格限制 3. 過河限制 4. 字色一致 5. 數量上限 6. 王不見王 7. 士五點。
輸出格式：請只返回 JSON 格式，包含 fen 欄位及簡短的識別說明。`;

async function recognizeBoard(base64Image) {
  if (!API_KEY) {
    throw new Error("API Key 未設定。請在 Vercel 設定 VITE_GEMINI_API_KEY。");
  }
  
  // 初始化 Gemini
  const genAI = new GoogleGenAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash', // 建議使用穩定版
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const prompt = `Output the Xiangqi Position in this photo and turn into Fen format.
請分析棋盤棋局並轉換為 FEN 格式。確保輸出的 FEN 是合法且準確的。`;

  try {
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
      }
    });

    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// --- React App 組件 (維持你原本的邏輯) ---
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
      setError(err.message || '識別過程中發生錯誤');
      setStatus('ERROR');
    }
  };

  const copyToClipboard = () => {
    if (result?.fen) {
      navigator.clipboard.writeText(result.fen);
      alert('FEN 已複製到剪貼簿！');
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
        <h1 className="text-3xl md:text-4xl font-bold text-red-800 mb-2">象棋棋局識別助手</h1>
        <p className="text-gray-600">利用 Gemini AI 視覺能力，拍照即得 FEN 棋譜代碼</p>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-6 md:p-8">
        <div className="relative mb-6">
          ${!image ? html`
            <div onClick=${() => fileInputRef.current?.click()} className="aspect-[4/3] w-full border-4 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-red-400 transition-colors bg-gray-50 group">
              <p className="text-lg font-semibold text-gray-700">點擊上傳或拍攝棋盤照片</p>
            </div>
          ` : html`
            <div className="relative aspect-[4/3] w-full bg-black rounded-2xl overflow-hidden">
              <img src=${image} className="w-full h-full object-contain" />
              <button onClick=${reset} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full">X</button>
            </div>
          `}
          <input type="file" ref=${fileInputRef} onChange=${handleImageUpload} accept="image/*" className="hidden" capture="environment" />
        </div>

        ${image && status === 'IDLE' && html`
          <button onClick=${processImage} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-4 rounded-xl shadow-lg">開始識別</button>
        `}

        ${status === 'PROCESSING' && html`<div className="text-center py-8 text-gray-700">Gemini 正在分析中...</div>`}

        ${status === 'SUCCESS' && result && html`
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-3 text-gray-800">識別結果 (FEN)</h3>
            <div className="bg-gray-900 rounded-xl p-6 relative">
              <code className="text-green-400 font-mono text-sm break-all">${result.fen}</code>
              <button onClick=${copyToClipboard} className="ml-4 text-white underline text-xs">複製</button>
            </div>
          </div>
        `}
        
        ${error && html`<div className="mt-4 text-red-600 bg-red-50 p-4 rounded-xl">${error}</div>`}
      </main>
    </div>
  `;
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));