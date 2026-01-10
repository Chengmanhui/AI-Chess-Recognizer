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
      const data = await recognizeBoar
