import React, { useState } from 'react';
import { Play, RefreshCw, Table as TableIcon } from 'lucide-react';
import DataMappingTable from './DataMappingTable'; // 匯入拆分出來的元件
import "./i18n";
import { useTranslation } from "react-i18next";

const ExperimentForm = ({ currentExp, onStart, onClear, isIterating, onExport }) => {
    const [isTableOpen, setIsTableOpen] = useState(false);
    const { t } = useTranslation();

    if (!currentExp) return null;

    return (
        <>
            <div className="form-card">
                <div className="form-container">
                    <div>
                        <h2 className="form-header-title">{currentExp.title}</h2>
                        <p className="form-header-subtitle">N={currentExp.quantumN}</p>
                    </div>
                    
                    <div className="form-button-group">
                        <button 
                            onClick={() => setIsTableOpen(!isTableOpen)}
                            className="btn-base btn-outline"
                        >
                            <TableIcon size={16} /> {isTableOpen ? t("hide_data") : t("view_data")}
                        </button>
                        
                        <button 
                            onClick={onStart}
                            disabled={isIterating}
                            className={`btn-primary ${isIterating ? 'btn-primary-disabled' : 'btn-primary-enabled'} ${!isIterating && !currentExp.circuit ? 'btn-primary-pulse' : ''}`}
                        >
                            {isIterating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                            {t("start_iteration")}
                        </button>

                        <button onClick={onExport} className="btn-base btn-outline">
                            {t("export_circuit")}
                        </button>

                        <button onClick={onClear} className="btn-base btn-outline">
                            {t("clear_data")}
                        </button>
                    </div>
                </div>
            </div>

            {isTableOpen && (
                <DataMappingTable 
                    mappings={currentExp.mappings} 
                    onClose={() => setIsTableOpen(false)} 
                />
            )}
        </>
    );
};

export default ExperimentForm;