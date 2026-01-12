import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
// 注意：確保 package.json 入面用的是 @google/generative-ai
import { GoogleGenerativeAI } from "@google/generative-ai";

const html = htm.bind(React.createElement);

// 讀取 Vite 環境變數
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ? import.meta.env.VITE_GEMINI_API_KEY.trim() : "";

const SYSTEM_INSTRUCTION = `你是一個專業的象棋棋盤識別助手。
你的任務是分析象棋棋盤照片並轉換為 FEN 格式。
請嚴格遵守象棋規則：紅方大寫 (KABNRCP)，黑方小寫 (kabnrcp)，9x10 網格。
只返回 JSON 格式，包含 fen 和 explanation 欄位。`;

async function recognizeBoard(base64Image) {
  // Debug 用：如果出錯，可以喺 F12 console 睇下 Key 入咗嚟未
  if (!API_KEY) {
    console.error("錯誤：VITE_GEMINI_API_KEY 是空的。請檢查 Vercel Environment Variables 設定。");
    throw new Error("API Key 未設定，請檢查 Vercel 設定並重新部署 (Redeploy)。");
  }

  // 初始化 Gemini (官方正確名稱)
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-3-flash",
    systemInstruction: SYSTEM_INSTRUCTION 
  });

  try {
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
          { text: "請識別這張象棋照片，並返回 FEN JSON。只返回 JSON，不要有其他文字。" }
        ]
      }],
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.1 
      }
    });

    const text = await result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini 呼叫失敗:", error);
    throw new Error("AI 分析失敗: " + (error.message || "未知錯誤"));
  }
}

function App() {
  const [status, setStatus] = useState('IDLE');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // 初始化時檢查 API Key
  useEffect(() => {
    if (!API_KEY) {
      console.warn("警告：未偵測到 VITE_GEMINI_API_KEY。");
    } else {
      console.log("API Key 已載入，長度為:", API_KEY.length);
    }
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { 
        setImage(reader.result); 
        setStatus('IDLE'); 
        setResult(null); 
        setError(null); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStart = async () => {
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

  return html`
    <div className="min-h-screen flex flex-col items-center p-6 md:p-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-red-900 text-center mb-2">象棋識別助手</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">影張相，AI 即刻幫你排好 FEN 棋譜</p>

        <div 
          onClick=${() => fileInputRef.current.click()}
          className="aspect-square w-full bg-white border-4 border-dashed border-gray-200 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden shadow-inner mb-6"
        >
          ${image ? html`<img src=${image} className="w-full h-full object-contain" />` : html`<div className="text-center text-gray-400 font-medium">📷 點擊拍攝或上傳棋盤</div>`}
        </div>
        <input type="file" ref=${fileInputRef} className="hidden" accept="image/*" onChange=${onFileChange} />

        ${image && (status === 'IDLE' || status === 'ERROR' || status === 'SUCCESS') && html`
          <button onClick=${handleStart} className="w-full bg-red-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all">
            ${status === 'SUCCESS' ? '重新識別' : '開始識別棋局'}
          </button>
        `}

        ${status === 'PROCESSING' && html`
          <div className="text-center py-4 text-red-700 font-bold animate-pulse">Gemini 正在精確識別棋子位置...</div>
        `}

        ${result && html`
          <div className="mt-6 space-y-4">
            <div className="bg-gray-900 p-5 rounded-2xl shadow-inner border border-gray-700">
              <p className="text-xs text-gray-500 uppercase font-bold mb-2">FEN 棋譜代碼</p>
              <code className="text-green-400 font-mono text-sm break-all">${result.fen}</code>
            </div>
            <button 
              onClick=${() => {navigator.clipboard.writeText(result.fen); alert('已複製 FEN');}}
              className="w-full py-3 border-2 border-red-700 text-red-700 rounded-xl font-bold hover:bg-red-50"
            >複製結果</button>
          </div>
        `}

        ${error && html`
          <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-xl border border-red-100 text-sm">
            <strong>發生錯誤：</strong> ${error}
          </div>
        `}
      </div>
    </div>
  `;
}

createRoot(document.getElementById('root')).render(React.createElement(App));

