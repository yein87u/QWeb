import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import "./i18n";
import { useTranslation } from "react-i18next";

const CircuitCanvas = ({ showCircuit, isIterating, n, circuitData, progress = 0 }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [scrollLeft, setScrollLeft] = useState(0);
    const quantumN = parseInt(n) || 0;
    const { t } = useTranslation();
    
    // 繪圖參數
    const stepWidth = circuitData && circuitData.length > 20 ? 50 : 80;
    const rowHeight = 60;
    const startY = 60;
    const labelWidth = 80; // 左側固定標籤區域的寬度
    const startX = labelWidth + 40; // 電路開始的起點（留一點間距）

    const handleScroll = (e) => {
        setScrollLeft(e.target.scrollLeft);
    };

    useEffect(() => {
        if (!showCircuit || !circuitData || !canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const container = containerRef.current;

        const viewWidth = container.clientWidth;
        const viewHeight = Math.max(450, quantumN * rowHeight + 100);

        canvas.width = viewWidth;
        canvas.height = viewHeight;
        ctx.clearRect(0, 0, viewWidth, viewHeight);

        // 計算當前可見範圍
        const startIndex = Math.max(0, Math.floor((scrollLeft) / stepWidth) - 2);
        const endIndex = Math.min(circuitData.length, Math.ceil((scrollLeft + viewWidth) / stepWidth) + 2);

        // --- 第一層：繪製量子位元橫線 (會移動) ---
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        for (let i = 0; i < quantumN; i++) {
            ctx.beginPath();
            ctx.moveTo(0, startY + i * rowHeight);
            ctx.lineTo(viewWidth, startY + i * rowHeight);
            ctx.stroke();
        }

        // --- 第二層：繪製閘門內容 (會移動) ---
        for (let stepIdx = startIndex; stepIdx < endIndex; stepIdx++) {
            const gateStep = circuitData[stepIdx];
            // 核心座標計算：原始起點 + 索引間距 - 捲動距離
            const x = startX + (stepIdx * stepWidth) - scrollLeft;

            // 跳過超出左側標籤區的繪製
            if (x < labelWidth - 20) continue;

            // GATE 文字
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("GATE", x, startY - 30); 
            ctx.fillText(`${stepIdx + 1}`, x, startY - 18);

            // 垂直連線
            const activeIndices = gateStep
                .map((v, i) => (v === 1 || v === 0 || v === 3) ? i : -1)
                .filter(i => i !== -1);

            if (activeIndices.length > 1) {
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2;
                for (let i = 0; i < activeIndices.length - 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x, startY + activeIndices[i] * rowHeight + 10);
                    ctx.lineTo(x, startY + activeIndices[i+1] * rowHeight - 10);
                    ctx.stroke();
                }
            }

            // 閘門符號
            gateStep.forEach((val, rowIdx) => {
                const y = startY + rowIdx * rowHeight;
                if (val === 1) { // 實心
                    ctx.fillStyle = '#60a5fa';
                    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
                } else if (val === 0) { // 空心
                    ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
                } else if (val === 3) { // 十字
                    ctx.strokeStyle = '#6060fa'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
                    ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
                    ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke();
                }
            });
        }

        // --- 第三層：固定在左側的 q[n] 標籤區域 ---
        // 先畫一塊深色背景蓋掉滾動過來的線條
        ctx.fillStyle = '#0f172a'; // 與容器背景色相同
        ctx.fillRect(0, 0, labelWidth, viewHeight);
        
        // 畫右邊界線
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(labelWidth, 0);
        ctx.lineTo(labelWidth, viewHeight);
        ctx.stroke();

        // 繪製固定文字 q[0], q[1]...
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        for (let i = 0; i < quantumN; i++) {
            ctx.fillText(`q[${i}]`, 20, startY + 5 + i * rowHeight);
        }

    }, [circuitData, showCircuit, quantumN, scrollLeft]);

    const totalWidth = circuitData ? (circuitData.length * stepWidth) + startX + 100 : 600;

    return (
        <div className="canvas-container relative">
            <div className="canvas-header">
                <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                    </div>
                    {isIterating && <span className="text-[10px] font-mono text-blue-400 animate-pulse ml-2 tracking-widest">REAL-TIME RENDERING</span>}
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Fixed Label Virtual View</span>
            </div>

            <div className={`canvas-mask-overlay ${isIterating ? 'active' : ''}`}>
                <div className="canvas-mask-content">
                    <div className="canvas-loader-spinner"></div>
                    
                    <p className="canvas-mask-status">
                        {t("canvas_mask_status")}
                    </p>
                    
                    <p className="canvas-mask-progress">
                        {t("canvas_mask_progress", { val: progress })}
                    </p>
                </div>
            </div>

            {isIterating && (
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
            )}
            
            <div 
                ref={containerRef}
                className="flex-1 overflow-x-auto overflow-y-auto relative"
                onScroll={handleScroll}
            >
                {(!circuitData || !showCircuit) && !isIterating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                        <Search size={32} className="opacity-20 mb-4" />
                        <p className="text-sm">{t("text_sm")}</p>
                    </div>
                )}

                {showCircuit && circuitData && (
                    <div style={{ width: `${totalWidth}px`, height: `${quantumN * rowHeight + 150}px`, position: 'relative' }}>
                        <canvas 
                            ref={canvasRef} 
                            style={{ 
                                position: 'sticky', 
                                left: 0, 
                                top: 0,
                                display: 'block'
                            }} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(CircuitCanvas);