import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Upload, Table as TableIcon } from 'lucide-react';
import "./i18n";
import { useTranslation } from "react-i18next";

    
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

const getInitialState = (initialData, t) => {
    if (initialData) {
        return {
            title: initialData.title || t("unnamed_experiment"),
            quantumN: initialData.quantumN || 1,
            mappings: parseInputData(initialData.input_data) || [] 
        };
    }
    return {
        title: t("unnamed_experiment"),
        quantumN: 1,
        mappings: []
    };
};

const NewExperimentDialog = ({ isOpen, onClose, onCreate, initialData }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState(getInitialState(initialData, t));
    const isReady = step === 1 ? formData.title.length > 0 : formData.mappings.length > 0;

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFormData(getInitialState(initialData, t)); 
        }
        
    }, [isOpen, initialData]);

    // 當 N 改變時只生成新的表格數據，不重置 title
    useEffect(() => {
        if (isOpen) {
            // 如果是編輯模式，且 N 沒變，且 mappings 已經有資料，就不要覆蓋它
            if (initialData && formData.quantumN === initialData.quantumN && formData.mappings.length > 0) {
                return;
            }
            const numRows = Math.pow(2, formData.quantumN);
            const newMappings = Array.from({ length: numRows }, (_, i) => ({
                input: i.toString(2).padStart(formData.quantumN, '0'),
                target: i,
                output: i.toString(2).padStart(formData.quantumN, '0')
            }));
            
            setFormData(prev => ({ ...prev, mappings: newMappings }));
        }
    }, [formData.quantumN, isOpen]);

    if (!isOpen) return null;

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleClose = () => {
        setStep(1); // 關閉時重置步驟
        onClose();  // 執行外部傳入的關閉邏輯
    };

    const handleTableChange = (index, newValue) => {
        const updatedMappings = [...formData.mappings];
        // 計算當前最大允許值
        const maxVal = Math.pow(2, formData.quantumN) - 1;
        let numericValue = parseInt(newValue, 10) || 0;

        if (isNaN(numericValue)) {
            numericValue = 0;
        } else if (numericValue > maxVal) {
            numericValue = maxVal; // 超過最大值則強制等於最大值
        } else if (numericValue < 0) {
            numericValue = 0;      // 小於 0 則強制等於 0
        }

        const binaryValue = numericValue.toString(2).padStart(formData.quantumN, '0');

        updatedMappings[index] = {
            ...updatedMappings[index],
            target: newValue,
            output: binaryValue // 這裡儲存的是二進位字串
        };

        setFormData(prev => ({
            ...prev,
            mappings: updatedMappings
        }));
    };

    const handleFinalSubmit = () => {
        onCreate(formData);
        setStep(1); // 重置步驟
        onClose();
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const values = text.split(',')
                .map(v => parseInt(v.trim()))
                .filter(v => !isNaN(v));

            const expectedCount = Math.pow(2, formData.quantumN);
            if (values.length !== expectedCount) {
                alert(t("error_data_length", { 
                        n: formData.quantumN, 
                        expected: expectedCount, 
                        actual: values.length 
                    }));
                return;
            }
            const updatedMappings = formData.mappings.map((mapping, idx) => {
                const newValue = values[idx];
                const binaryValue = newValue.toString(2).padStart(formData.quantumN, '0');
                
                return {
                    ...mapping,
                    target: newValue,
                    output: binaryValue
                };
            });

            setFormData(prev => ({ ...prev, mappings: updatedMappings }));
        };
        reader.readAsText(file);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">{t("configure_exp_params")} ({step}/3)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                {step === 1 && (
                    <div className="space-y-8">
                        <h4 className="text-2xl font-bold text-slate-800">{t("first_step")}</h4>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <label className="w-32 font-medium text-slate-700">{t("exp_name")}</label>
                                <input 
                                    type="text"
                                    className="flex-1 p-2 border border-blue-100 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="w-32 font-medium text-slate-700">{t("quantum_n")}</label>
                                <input 
                                    type="number"
                                    className="w-24 p-2 border border-blue-100 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.quantumN}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const safeValue = isNaN(val) ? 1 : Math.max(1, val);
                                        setFormData({
                                            ...formData, 
                                            quantumN: safeValue
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <h4 className="text-2xl font-bold text-slate-800">{t("second_step")}</h4>
                        <div className="flex gap-3">
                            <input type="file" ref={fileInputRef} className="hidden" accept=".txt" onChange={handleFileUpload} />
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                            >
                                <Upload size={16} /> {t("import")}
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="w-1/4 table-header-sm">{t("input")}</th>
                                        <th className="w-1/2 table-header-sm">{t("target_output")}</th>
                                        <th className="w-1/4 table-header-sm">{t("output_preview")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {formData.mappings.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="table-cell-mono-primary">|{row.input}⟩</td>
                                            <td className="p-2">
                                                <input 
                                                    type="number"
                                                    className="w-full p-2 border border-slate-200 rounded bg-white focus:border-blue-500 outline-none"
                                                    value={row.target}
                                                    min="0"
                                                    max={Math.pow(2, formData.quantumN) - 1}
                                                    onChange={(e) => handleTableChange(idx, e.target.value)}
                                                />
                                            </td>
                                            <td className="table-cell-mono-indigo">
                                                |{row.output ?? parseInt(row.target || 0).toString(2).padStart(formData.quantumN, '0')}⟩
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8">
                        <h4 className="text-2xl font-bold text-slate-800">{t("third_step")}</h4>
                        <div className="space-y-4 text-lg">
                            <p className="flex gap-2">
                                <span className="font-bold text-slate-600">{t("exp_name")}</span>
                                <span className="text-slate-800">{formData.title}</span>
                            </p>
                            <p className="flex gap-2">
                                <span className="font-bold text-slate-600">{t("quantum_n")}</span>
                                <span className="text-slate-800">{formData.quantumN}</span>
                            </p>
                        </div>
                    </div>
                )}
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50/50">
                    {step > 1 ? (
                        <button onClick={prevStep} className="px-6 py-2 border border-slate-300 bg-white rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition">
                            {t("previous_step")}
                        </button>
                    ) : <div />}
                    
                    {step < 3 ? (
                        <button 
                            onClick={nextStep}
                            className={`px-8 py-2 border rounded-xl font-bold transition active:scale-95 shadow-sm 
                                ${isReady ? 'bg-blue-50 border-blue-300 text-blue-700 animate-pulse btn-ring-style' : 'bg-white border-slate-200 text-slate-700'}
                            `}
                        >
                            {t("next_step")}
                        </button>
                    ) : (
                        <button 
                            onClick={handleFinalSubmit}
                            className={`px-8 py-2 rounded-xl font-bold transition active:scale-95 shadow-lg 
                                ${isReady ? 'bg-blue-600 text-white animate-pulse btn-ring-style' : 'bg-slate-900 text-white hover:bg-slate-800'}
                            `}
                        >
                            {t("confirm_start")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewExperimentDialog;