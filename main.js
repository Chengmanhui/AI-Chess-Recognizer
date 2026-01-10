import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { GoogleGenAI } from "@google/genai";

const html = htm.bind(React.createElement);

// 加咗 .trim() 嚟自動清除頭尾嘅換行或空格
const RAW_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_KEY = RAW_KEY ? RAW_KEY.trim() : null;

async function recognizeBoard(base64Image) {
  if (!API_KEY || API_KEY.length < 20) {
    throw new Error("API Key 讀取失敗或格式不正確。請確保 Vercel 設定中無多餘換行。");
  }

  try {
    const genAI = new GoogleGenAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 簡化 Prompt 嚟測試
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: "Output the Xiangqi FEN string for this board in JSON format: { \"fen\": \"...\" }" }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    throw new Error("Gemini 錯誤: " + error.message);
  }
}

function App() {
  const [status, setStatus] = useState('IDLE');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const processImage = async () => {
    setStatus('PROCESSING');
    setError(null);
    try {
      const data = await recognizeBoard(image);
      setResult(data);
      setStatus('SUCCESS');
    } catch (err) {
      setError(err);
      setStatus('ERROR');
    }
  };

  return html`
    <div className="p-8 max-w-md mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6 text-red-800">象棋識別助手</h1>
      <div className="border-2 border-dashed p-4 mb-4 text-center cursor-pointer" onClick=${() => fileInputRef.current.click()}>
        ${image ? html`<img src=${image} />` : "撳我影相"}
      </div>
      <input type="file" ref=${fileInputRef} className="hidden" onChange=${(e) => {
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(e.target.files[0]);
      }} />
      
      ${image && status === 'IDLE' && html`<button onClick=${processImage} className="w-full bg-red-600 text-white p-3 rounded">開始分析</button>`}
      ${status === 'PROCESSING' && html`<p>AI 正在思考中...</p>`}
      ${result && html`<div className="mt-4 p-4 bg-black text-green-400 rounded">FEN: ${result.fen}</div>`}
      ${error && html`<p className="text-red-500 mt-4">${error}</p>`}
    </div>
