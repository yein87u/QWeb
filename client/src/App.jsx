import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ExperimentForm from './components/ExperimentForm';
import CircuitCanvas from './components/CircuitCanvas';
import NewExperimentDialog from './components/NewExperimentDialog';
import ConfirmDialog from './components/ConfirmDialog';
import { PlusCircle } from 'lucide-react';
import "./components/i18n";
import { useTranslation } from "react-i18next";

function App() {
	const [isSidebarOpen, setSidebarOpen] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [experiments, setExperiments] = useState([]);
	const [activeExp, setActiveExp] = useState(null); // 當前正在編輯/顯示的實驗
	const [isIterating, setIsIterating] = useState(false);
	const [showCircuit, setShowCircuit] = useState(false);
	const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        message: "",
        onConfirm: null,
		onlyConfirm: false
    });
	const { t } = useTranslation();
	const [editingExp, setEditingExp] = useState(null);

	const closeDialog = () => {
        setDialogConfig({ ...dialogConfig, isOpen: false });
    };

	useEffect(() => {
		fetch('http://localhost:8000/experiments')
			.then(res => res.json())
			.then(data => {
				console.log("從後端抓到的所有實驗:", data); // 在此檢查 data[0].input_data 是否存在
				setExperiments(data);
		})
		.catch(err => console.error("資料載入失敗:", err));
	}, []);

	const checkIterating = (action, ...args) => {
		if (isIterating) {
			setDialogConfig({
				isOpen: true,
				message: t("wait_msg"),
				onlyConfirm: true,
				onConfirm: closeDialog
			});
			return false;
		}
		action(...args);
		return true;
	};

	const handleSaveExperiment = async (data) => {
		console.log(data)
		try {
			let response;
			if (editingExp) {
				// 編輯模式：發送 PUT 請求到特定 ID
				response = await fetch(`http://localhost:8000/experiment/${editingExp.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});
			} else {
				// 新增模式：發送 POST 請求
				response = await fetch('http://localhost:8000/experiments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});
			}
			if (!response.ok) throw new Error("後端連線或處理失敗");
			const savedData = await response.json(); 
			// 統一解析後端回傳的資料
			const formattedExp = {
				...savedData,
				// 使用你現有的解析函式將 CSV 字串轉回陣列物件
				mappings: parseInputData(savedData.input_data),
				// 解析電路資料 (如果存在的話)
				circuit: savedData.circuit_data ? JSON.parse(savedData.circuit_data) : null
			};
			if (editingExp) {
				// 更新現有列表中的該筆實驗資料
				setExperiments(prev => prev.map(exp => exp.id === formattedExp.id ? formattedExp : exp));
			} else {
				// 將新建立的實驗加入列表頂部
				setExperiments(prev => [formattedExp, ...prev]);
			}
			// 設定當前選取的實驗，讓畫面立即更新
			setActiveExp(formattedExp);
			setShowCircuit(!!formattedExp.circuit); // 若有電路資料則顯示畫布
			// 關閉對話框並清空編輯狀態
			setIsDialogOpen(false);
			setEditingExp(null);
		} catch (err) {
			setDialogConfig({
				isOpen: true,
				message: t("save_error_msg"),
				onConfirm: async () => {}
			});
			console.error("Save Error:", err);
		}
	};

	const handleSelectExperiment = async (exp) => {
		try {
			const response = await fetch(`http://localhost:8000/experiments/${exp.id}`);
			const fullData = await response.json();
			const mappedData = parseInputData(fullData.input_data);
			let parsedCircuit = null;
			if (fullData.circuit_data) {
				try {
					parsedCircuit = typeof fullData.circuit_data === 'string' 
					? JSON.parse(fullData.circuit_data) 
					: fullData.circuit_data;
				} catch (e) {
					console.error("解析電路資料失敗:", e);
				}
			}
			setActiveExp({
				...fullData,
				mappings: mappedData,
				circuit: parsedCircuit 
			});
			setShowCircuit(!!parsedCircuit);
		} catch (err) {
			console.error("載入實驗詳情失敗", err);
		}
	}

	// 新增一個開啟編輯的方法
	const handleEdit = (exp) => {
		setEditingExp(exp);
		setIsDialogOpen(true);
	};

	const handleClearAll = () => {
        setDialogConfig({
            isOpen: true,
            message: t("confirm_del_all_exp_msg"),
            onConfirm: async () => {
                try {
                    await fetch('http://localhost:8000/experiments', { method: 'DELETE' });
                    setExperiments([]);
                    setActiveExp(null);
                    setShowCircuit(false);
                } catch (err) {
                    console.error("清除資料失敗:", err);
                }
                closeDialog();
            }
        });
    };

	const handleClear = async () => {
		if (!activeExp) return;
		const updatedExp = { ...activeExp, circuit: null, circuit_data: null };
		setActiveExp(updatedExp);
		setShowCircuit(false);

		setExperiments(prev => prev.map(exp => 
			exp.id === updatedExp.id ? updatedExp : exp
		));

		// 同步後端
		try {
			await fetch(`http://localhost:8000/experiments/${updatedExp.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ circuit_data: null })
			});
		} catch (err) {
			console.error("清除電路資料失敗:", err);
		}
	};

	const handleExport = async () => {
		// 檢查是否有有效的實驗與電路數據
		if (!activeExp || !activeExp.circuit) {
			setDialogConfig({
				isOpen: true,
				message: t("export_no_circuit_msg"),
				onConfirm: async () => {}
			});
			return;
		}

		try {
			// 呼叫後端新增的 generate-qasm 路由
			const response = await fetch('http://localhost:8000/generate-qasm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					circuit: activeExp.circuit,
					title: activeExp.title || "circuit"
				}),
			});

			if (!response.ok) {
				throw new Error('後端生成 QASM 失敗');
			}

			const data = await response.json();
			const qasmString = data.qasm;

			// 建立下載連結並觸發下載
			const blob = new Blob([qasmString], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${data.title}.qasm`;
			document.body.appendChild(link);
			link.click();

			// 清理
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

		} catch (error) {
			console.error("匯出失敗:", error);
			setDialogConfig({
				isOpen: true,
				message: t("export_failure_msg"),
				onConfirm: async () => {}
			});
		}
	};

	const handleStartIteration = async () => {
		if (!activeExp) return;
		setIsIterating(true);
		setShowCircuit(true);

		const payload = {
			title: activeExp.title,
			quantumN: activeExp.quantumN,
			mappings: activeExp.mappings || []
		};

		try {
			// 使用您後端定義的優化路由
			const response = await fetch(`http://localhost:8000/optimize/${activeExp.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = ""; 

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop();

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const parsedData = JSON.parse(line.replace('data: ', ''));
						console.log("後端傳回的原始數據:", parsedData);
						setActiveExp(prev => ({
							...prev,
							circuit: parsedData.circuit,
							epoch: parsedData.epoch,
							progress: parsedData.total_epochs > 0 
							? Math.min(100, Math.round((parsedData.epoch / parsedData.total_epochs) * 100)) 
							: 0,
							circuit_data: parsedData.circuit_data || null
						}));
					}
				}
			}
		} catch (error) {
			console.error("連接錯誤:", error);
		} finally {
			setIsIterating(false);
		}
	};

	const handleDelete = (id) => {
        setDialogConfig({
            isOpen: true,
            message: t("confirm_del_exp_msg"),
            onConfirm: async () => {
                setExperiments((prev) => prev.filter((exp) => exp.id !== id));
                try {
                    await fetch(`http://localhost:8000/experiments/${id}`, { method: 'DELETE' });
                } catch (error) {
                    console.error("刪除失敗:", error);
                }
                if (activeExp && activeExp.id === id) {
                    setActiveExp(null);
                }
                closeDialog(); // 執行完畢關閉對話框
            }
        });
    };

	const parseInputData = (inputDataString) => {
		if (!inputDataString) return [];

		return inputDataString.split('\n').filter(line => line.trim() !== "").map(line => {
			const [input, target] = line.split(',');
			const targetint = parseInt(target, 10)
			return { 
				input: input, 
				target: targetint,
				output: targetint.toString(2).padStart(input.length, '0')
			};
		});
	};

	const handleBackToHome = () => {
		setActiveExp(null);
		setShowCircuit(false);
	};

	return (
		<div className="app-layout">
			<Sidebar 
				isOpen={isSidebarOpen} 
				experiments={experiments} 
				onAdd={() => checkIterating(() => {
					setEditingExp(null);
					setIsDialogOpen(true);
				})}
				onClearAll={() => checkIterating(handleClearAll)}
				onSelect={(exp) => checkIterating(() => handleSelectExperiment(exp))}
				onDelete={(id) => checkIterating(() => handleDelete(id))}
				activeId={activeExp?.id}
				onEdit={(exp) => checkIterating(() => handleEdit(exp))}
			/>

			<div className="flex-1 flex flex-col min-w-0">
				<Header
					toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
					onBackToHome={() => checkIterating(handleBackToHome)}
				/>

				<main className="main-content">
					<div className="content-container">
						{activeExp ? (
							<div 
								key={activeExp.id} 
								className="animate-in"
							>
								<div className="active-exp-wrapper">
									<ExperimentForm
										currentExp={activeExp}
										setExp={setActiveExp}
										onStart={handleStartIteration}
										onClear={() => checkIterating(handleClear)}
										isIterating={isIterating}
										onExport={() => checkIterating(handleExport)}
										onEdit={() => checkIterating(() => handleEdit(activeExp))}
									/>

									<CircuitCanvas
										showCircuit={showCircuit}
										isIterating={isIterating}
										n={activeExp.quantumN}
										circuitData={activeExp.circuit}
										progress={activeExp.progress || 0}
									/>
								</div>
							</div>
						) : (
							<div key="home" className="animate-in">
								<div className="empty-dashboard-wrapper">
									<section className="welcome-section">
										<div>
											<h1 className="welcome-title">{t("welcome_title")}</h1>
											<p className="welcome-subtitle">{t("welcome_subtitle")}</p>
										</div>
										<div className="stat-card-group">
											<div className="stat-card">
												<div className="stat-card-label">{t("stat_card_label")}</div>
												<div className="stat-card-value status-ready">Ready</div>
											</div>
										</div>
									</section>

									{/* 主操作區 */}
									<div className="hero-grid">
										<div className="hero-banner">
											<div className="hero-content">
												<h2 className="hero-title">{t("hero_title")}</h2>
												<p className="hero-desc">
													{t("hero_desc")}
												</p>
												<button
													onClick={() => checkIterating(() => setIsDialogOpen(true))}
													className="hero-btn"
												>
													<PlusCircle size={20} />
													{t("now_start")}
												</button>
											</div>
											<div className="hero-bg-icon">
												<PlusCircle size={240} />
											</div>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</main>
			</div>

			<NewExperimentDialog 
				key={editingExp ? `edit-${editingExp.id}` : 'new-exp'}
				isOpen={isDialogOpen} 
				onClose={() => checkIterating(() => setIsDialogOpen(false))} 
				onCreate={(data) => checkIterating(handleSaveExperiment, data)}
				initialData={editingExp}/>

			
			<ConfirmDialog 
				isOpen={dialogConfig.isOpen}
				message={dialogConfig.message}
				onConfirm={dialogConfig.onConfirm}
				onCancel={closeDialog}
				onlyConfirm={isIterating}
			/>
		</div>
	);
}

export default App;