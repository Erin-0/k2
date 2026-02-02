import { Shield } from 'lucide-react';

interface AlertModalProps {
    show: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert';
    onConfirm: () => void;
    onClose: () => void;
}

export const AlertModal = ({ 
    show, 
    title, 
    message, 
    type, 
    onConfirm, 
    onClose 
}: AlertModalProps) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal v-clip" onClick={e => e.stopPropagation()}>
                <div className="modal__header">
                    <Shield className="modal__header-icon" size={20} />
                    <h3 className="modal__title mono">{title}</h3>
                </div>
                <div className="modal__body">
                    <p className="modal__message">{message}</p>
                </div>
                <div className="modal__footer">
                    {type === 'confirm' ? (
                        <>
                            <button className="btn btn--primary v-clip" onClick={onConfirm}>
                                تأكيد التنفيذ
                            </button>
                            <button className="btn btn--secondary v-clip" onClick={onClose}>
                                إلغاء
                            </button>
                        </>
                    ) : (
                        <button className="btn btn--primary btn--full v-clip" onClick={onClose}>
                            فهمت
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
