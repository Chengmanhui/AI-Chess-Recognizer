import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { GoogleGenAI } from "@google/genai";

const html = htm.bind(React.createElement);
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ? import.meta.env.VITE_GEMINI_API_KEY.trim() : "";

async function recognizeBoard(base64Image) {
  if (!API_KEY || API_KEY.length < 20) {
    throw new Error("API Key 設定不正確，請檢查 Vercel 設定。");
  }

  const genAI = new GoogleGenAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `你是一個象棋專業助手。請識別這張象棋照片，並將結果轉換為 FEN 格式。
請嚴格遵守象棋規則：
1. 9x10 網格。2. 九宮格限制。3. 兵卒過河限制。
請只返回 JSON 格式：{ "fen": "...", "explanation": "..." }`;

  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error(error);
    throw new Error("Gemini 分析失敗: " + error.message);
  }
}

function App() {
  const [status, setStatus] = useState('IDLE');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { setImage(reader.result); setStatus('IDLE'); setResult(null); setError(null); };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    setStatus('PROCESSING');
    setError(null);
    try {
      const data = await recognizeBoard(image);
      setResult(data);
      setStatus('SUCCESS');
    } catch (err) {
      setError(err.message);
      setStatus('ERROR');
    }
  };

  return html`
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-red-800">象棋棋局識別助手</h1>
        <p className="text-gray-500 text-sm">利用 Gemini AI 自動生成 FEN 棋譜</p>
      </header>

      <main className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl">
        <div 
          onClick=${() => status !== 'PROCESSING' && fileInputRef.current.click()}
          className="aspect-square mb-6 border-4 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer"
        >
          ${image ? html`<img src=${image} className="w-full h-full object-contain" />` : html`<span className="text-gray-400">點擊影相或上傳</span>`}
        </div>
        <input type="file" ref=${fileInputRef} className="hidden" accept="image/*" capture="environment" onChange=${handleUpload} />

        ${image && status === 'IDLE' && html`
          <button onClick=${startAnalysis} className="w-full bg-red-700 text-white py-4 rounded-xl font-bold shadow-lg">開始分析</button>
        `}

        ${status === 'PROCESSING' && html`<div className="text-center text-red-700 animate-pulse font-bold">正在分析中...</div>`}

        ${result && html`
          <div className="mt-6">
            <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs break-all">
              ${result.fen}
            </div>
            <button 
              onClick=${() => {navigator.clipboard.writeText(result.fen); alert('已複製')}}
              className="w-full mt-2 text-sm text-red-700 underline"
            >複製 FEN</button>
          </div>
        `}

        ${error && html`<div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">${error}</div>`}
      </main>
    </div>
  `;
}

createRoot(document.getElementById('root')).render(React.createElement(App));
