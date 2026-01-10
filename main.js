import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// 1. 嘗試讀取 Key
const VITE_KEY = import.meta.env.VITE_GEMINI_API_KEY;

function App() {
  const [debugInfo, setDebugInfo] = useState("未開始分析");

  const runTest = async () => {
    setDebugInfo("正在測試...");
    
    // 2. 檢查 Key 到底係乜
    const keyType = typeof VITE_KEY;
    const keyLength = VITE_KEY ? VITE_KEY.length : 0;
    const isViteVariableDefined = typeof import.meta.env !== 'undefined';

    if (!VITE_KEY || VITE_KEY === "undefined") {
      setDebugInfo(`❌ Key 讀取失敗！\n類型: ${keyType}\n是否定義了 Vite: ${isViteVariableDefined}\n請確保 Vercel Settings 裡面有 VITE_GEMINI_API_KEY 並已 Redeploy。`);
      return;
    }

    try {
      const genAI = new GoogleGenAI(VITE_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      setDebugInfo(`✅ Key 讀取成功 (長度: ${keyLength})，正在嘗試通訊...`);
      
      const result = await model.generateContent("Say hello");
      setDebugInfo(`🎉 成功！Gemini 回應: ${result.response.text()}`);
    } catch (e) {
      setDebugInfo(`❌ SDK 報錯: ${e.message}\nKey 內容頭兩位: ${VITE_KEY.substring(0, 2)}...`);
    }
  };

  return React.createElement('div', { className: 'p-10 font-mono' }, [
    React.createElement('h1', { className: 'text-xl font-bold mb-4' }, 'Gemini 連線診斷器'),
    React.createElement('button', { 
      onClick: runTest,
      className: 'bg-blue-500 text-white p-4 rounded-lg'
    }, '撳我開始診斷'),
    React.createElement('pre', { className: 'mt-6 p-4 bg-gray-100 rounded border whitespace-pre-wrap' }, debugInfo)
  ]);
}

createRoot(document.getElementById('root')).render(React.createElement(App));
