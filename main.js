import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { GoogleGenAI } from "@google/genai";

const html = htm.bind(React.createElement);

// 讀取環境變量
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function recognizeBoard(base64Image) {
  // --- 除錯 Log ---
  console.log("Checking API Key...");
  if (!API_KEY) {
    // 如果係空嘅，會彈呢句
    throw new Error("偵測到 API Key 是空的！請檢查 Vercel Settings 嘅 Key 名稱是否為 VITE_GEMINI_API_KEY 並勾選了 Production。");
  }

  try {
    const genAI = new GoogleGenAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: "Output Xiangqi FEN in JSON format." }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    throw new Error("Gemini 報錯: " + error.message);
  }
}

// React 部分維持不變 (簡化顯示)
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
      const res = await recognizeBoard(image);
      setResult(res);
      setStatus('SUCCESS');
    } catch (err) {
      setError(err.message);
      setStatus('ERROR');
    }
  };

  return html`
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">象棋識別排錯版</h1>
      
      <input type="file" ref=${fileInputRef} className="hidden" onChange=${(e) => {
        const reader = new FileReader();
        reader.onloadend = () => setImage(reader.result);
        reader.readAsDataURL(e.target.files[0]);
      }} />

      <button onClick=${() => fileInputRef.current.click()} className="bg-blue-500 text-white p-2 rounded mb-4">
        1. 揀相
      </button>

      ${image && html`
        <button onClick=${processImage} className="bg-red-500 text-white p-2 rounded ml-2">
          2. 開始分析
        </button>
      `}

      ${status === 'PROCESSING' && html`<p>分析中...</p>`}
      ${error && html`<p className="text-red-500 mt-4 font-bold">❌ 錯誤：${error}</p>`}
      ${result && html`<pre className="bg-gray-100 p-2 mt-4">${JSON.stringify(result, null, 2)}</pre>`}
    </div>
  `;
}

createRoot(document.getElementById('root')).render(React.createElement(App));
