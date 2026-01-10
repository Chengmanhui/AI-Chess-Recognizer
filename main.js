import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { GoogleGenAI } from "@google/genai";

const html = htm.bind(React.createElement);

// 讀取 Key 並去除空格
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ? import.meta.env.VITE_GEMINI_API_KEY.trim() : "";

function App() {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('READY');
  const [res, setRes] = useState('');

  const handleRun = async () => {
    if (!API_KEY) { 
      alert("Error: Vercel Settings 搵唔到 VITE_GEMINI_API_KEY！");
      return; 
    }
    setStatus('LOADING');
    try {
      const genAI = new GoogleGenAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([
        "請識別圖中象棋佈局並給出 FEN。",
        { inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } }
      ]);
      setRes(result.response.text());
      setStatus('DONE');
    } catch (e) {
      alert("分析出錯: " + e.message);
      setStatus('READY');
    }
  };

  return html`
    <div className="p-10 max-w-lg mx-auto bg-white shadow-2xl rounded-2xl mt-10">
      <h1 className="text-2xl font-bold text-red-700 mb-4">象棋識別 v2.0 (穩定版)</h1>
      <p className="text-xs text-gray-400 mb-4">Key 狀態: ${API_KEY ? "✅ 已讀取" : "❌ 未讀取"}</p>
      
      <input type="file" accept="image/*" onChange=${(e) => {
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(e.target.files[0]);
      }} className="mb-4 block w-full text-sm text-gray-500" />

      ${image && html`<img src=${image} className="w-full rounded mb-4 shadow" />`}
      
      <button 
        onClick=${handleRun} 
        disabled=${!image || status === 'LOADING'}
        className="w-full bg-red-600 text-white p-4 rounded-xl font-bold disabled:bg-gray-300"
      >
        ${status === 'LOADING' ? "Gemini 分析中..." : "開始分析"}
      </button>

      ${res && html`
        <div className="mt-6 p-4 bg-gray-100 rounded border border-gray-300">
          <p className="font-bold text-sm mb-2 text-gray-700">分析結果：</p>
          <div className="text-sm font-mono break-all">${res}</div>
        </div>
      `}
    </div>
  `;
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(App));
