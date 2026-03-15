import React from 'react';
import { Plus, Trash2, History, Cpu, Edit2} from 'lucide-react';

const Sidebar = ({ isOpen, experiments, onAdd, onClearAll, onSelect, onDelete, activeId, onEdit }) => {
    return (
        <aside className={`sidebar-aside ${isOpen ? 'w-64' : 'w-0'}`}>
            <div className="sidebar-inner">
                <div className="sidebar-header">
                    <Cpu className="text-blue-400 shrink-0" />
                    <span className="font-bold text-lg whitespace-nowrap tracking-tight">量子實驗平台(Logos)</span>
                </div>
                
                <div className="p-4">
                    <button 
                        onClick={onAdd}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg font-medium transition-all active:scale-95 whitespace-nowrap text-white"
                    >
                        <Plus size={18} /> 新增實驗
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3">
                    <div className="text-[10px] font-bold text-slate-500 px-2 mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                        <History size={12} className="shrink-0" /> 歷史紀錄
                    </div>
                    <div className="space-y-1">
                        {experiments.map((exp) => {
                            const isActive = activeId === exp.id;
                            
                            return (
                                /* 將 group 放在 className 中，不要 @apply 到 CSS 裡 */
                                <div 
                                    key={exp.id} 
                                    onClick={() => onSelect(exp)}
                                    className={`group sidebar-item-style transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-blue-600/20 border-l-4 border-blue-500 text-white' // 選中時的樣式
                                        : 'hover:bg-slate-800 border-l-4 border-transparent'     // 未選中時的樣式
                                    }`}
                                >
                                    <div className={`truncate text-sm flex-1 mr-2 ${
                                        isActive ? 'text-blue-400 font-bold' : 'text-slate-300 group-hover:text-white'
                                    }`}>
                                        {exp.title}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`sidebar-label-tag ${
                                            isActive ? 'bg-blue-500/30 text-blue-300' : ''
                                        }`}>
                                            n={exp.quantumN}
                                        </span>
                                        {isActive && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // 防止觸發 onSelect
                                                    onEdit(exp);
                                                }}
                                                className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                                title="編輯實驗參數"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(exp.id);
                                            }}
                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button 
                        onClick={onClearAll}
                        className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={14} /> 清除所有數據
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;