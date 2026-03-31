import React from 'react';
import "./i18n";
import { useTranslation } from "react-i18next";

const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel, onlyConfirm }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                <h3 className="text-lg font-bold mb-4">{t("system_confirm")}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    {!onlyConfirm && (
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                        {t("system_cancel")}
                    </button>
                    )}
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        {t("system_confirm_action")}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default ConfirmDialog;