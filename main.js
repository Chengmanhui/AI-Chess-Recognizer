import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { GoogleGenAI } from "@google/genai";

const html = htm.bind(React.createElement);

// 1. 讀取並徹底清潔 API Key
const RAW_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_KEY = RAW_KEY ? RAW_KEY.trim() : "";

async function recognizeBoard(base64Image) {
  // 檢查 Key 長度是否正常 (Gemini Key 通常大約 39 位)
  if (!API_KEY || API_KEY.length < 20) {
    throw new Error("讀取到的 API Key 長度不足，請檢查 Vercel 環境變量設定。");
  }

  try {
    // 2. 使用物件格式初始化 (最穩陣寫法)
    const genAI = new GoogleGenAI({ apiKey: API_KEY });
    
    // 3. 獲取模型
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    const prompt = "請識別這張象棋照片，將結果轉換為 FEN 格式。請只返回 JSON：{ \"fen\": \"...\", \"explanation\": \"...\" }";

    // 4. 發送請求
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

    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("SDK Error:", error);
    // 捕捉常見嘅 Key 報錯
    if (error.message.includes("API key not valid")) {
      throw new Error("Gemini 判斷此 API Key 無效，請確認是否抄錯咗 Key。");
    }
    throw new Error("Gemini 報錯: " + error.message);
  }
}

// --- React 介面 ---
function App() {
  const [status, setStatus] = useState('IDLE');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const processImage = async () => {
    if (!image) return;
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

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setStatus('IDLE');
  };

  return html`
    <div className="min-h-screen flex flex-col items-center p-8 bg-[#fcfaf7] font-sans">
      <h1 className="text-3xl font-bold text-red-800 mb-8 text-center">象棋棋局識別助手</h1>
      
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
        <div 
          onClick=${() => status !== 'PROCESSING' && fileInputRef.current.click()}
          className="aspect-video mb-6 border-4 border-dashed border-gray-200 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden bg-gray-50 hover:border-red-300 transition-colors"
        >
          ${image ? html`<img src=${image} className="w-full h-full object-contain" />` : html`<span className="text-gray-400 font-medium">📷 點擊拍攝或上傳棋盤</span>`}
        </div>
        
        <input type="file" ref=${fileInputRef} className="hidden" accept="image/*" onChange=${(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => { setImage(reader.result); setStatus('IDLE'); setError(null); };
            reader.readAsDataURL(file);
          }
        }} />

        ${image && status === 'IDLE' && html`
          <button onClick=${processImage} className="w-full bg-red-700 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">
            開始 AI 識別
          </button>
        `}

        ${status === 'PROCESSING' && html`
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-700 border-t-transparent mb-2"></div>
            <p className="text-red-700 font-medium">Gemini 正在分析中...</p>
          </div>
        `}

        ${status === 'SUCCESS' && result && html`
          <div className="mt-6 animate-in fade-in">
            <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase">識別結果 (FEN)</h3>
            <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
              <code className="text-green-400 font-mono text-xs break-all">${result.fen}</code>
              <button onClick=${() => {navigator.clipboard.writeText(result.fen); alert('已複製！')}} className="ml-2 text-white text-xs underline">複製</button>
            </div>
            <button onClick=${reset} className="w-full mt-4 border border-gray-200 py-2 rounded-lg text-sm text-gray-600">重新掃描</button>
          </div>
        `}

        ${status === 'ERROR' && html`
          <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 text-red-700 text-sm">
            <strong>❌ 錯誤：</strong> ${error}
          </div>
        `}
      </div>
    </div>
  `;
}

createRoot(document.getElementById('root')).render(React.createElement(App));
