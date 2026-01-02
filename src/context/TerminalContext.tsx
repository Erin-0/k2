import React, { createContext, useContext, useState, useCallback } from 'react';
import { ShieldAlert, Info, CheckCircle2 } from 'lucide-react';


interface TerminalContextType {
    showAlert: (message: string, title?: string) => void;
    showConfirm: (message: string, title?: string) => Promise<boolean>;
    showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
    showToast: (message: string, duration?: number) => void;
}


const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alert, setAlert] = useState<{ message: string; title: string; visible: boolean }>({ message: '', title: '', visible: false });
    const [confirm, setConfirm] = useState<{
        message: string;
        title: string;
        visible: boolean;
        resolve: (v: boolean) => void;
    } | null>(null);
    const [prompt, setPrompt] = useState<{
        message: string;
        defaultValue: string;
        title: string;
        visible: boolean;
        resolve: (v: string | null) => void;
    } | null>(null);
    const [promptValue, setPromptValue] = useState('');
    const [toasts, setToasts] = useState<{ id: number; message: string; visible: boolean }[]>([]);


    const showAlert = useCallback((message: string, title = "SYSTEM_NOTIFICATION") => {
        setAlert({ message, title, visible: true });
    }, []);

    const showConfirm = useCallback((message: string, title = "AUTHORIZATION_REQUIRED") => {
        return new Promise<boolean>((resolve) => {
            setConfirm({ message, title, visible: true, resolve });
        });
    }, []);

    const showPrompt = useCallback((message: string, defaultValue = '', title = "INPUT_REQUIRED") => {
        setPromptValue(defaultValue);
        return new Promise<string | null>((resolve) => {
            setPrompt({ message, defaultValue, title, visible: true, resolve });
        });
    }, []);


    const showToast = useCallback((message: string, duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, visible: true }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const handleConfirmResponse = (response: boolean) => {
        if (confirm) {
            confirm.resolve(response);
            setConfirm(null);
        }
    };

    const handlePromptResponse = (value: string | null) => {
        if (prompt) {
            prompt.resolve(value);
            setPrompt(null);
            setPromptValue('');
        }
    };

    return (
        <TerminalContext.Provider value={{ showAlert, showConfirm, showPrompt, showToast }}>

            {children}

            {/* Global Alert Modal */}
            {alert.visible && (
                <div className="terminal-modal-overlay">
                    <div className="terminal-modal card-glow">
                        <div className="scanline"></div>
                        <div className="modal-header">
                            <ShieldAlert size={18} color="var(--primary)" />
                            <span className="micro-label">{alert.title}</span>
                        </div>
                        <div className="modal-body">
                            <p>{alert.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="primary" onClick={() => setAlert({ ...alert, visible: false })}>
                                ACKNOWLEDGE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Confirm Modal */}
            {confirm?.visible && (
                <div className="terminal-modal-overlay">
                    <div className="terminal-modal card-glow confirm">
                        <div className="scanline"></div>
                        <div className="modal-header">
                            <Info size={18} color="var(--warning)" />
                            <span className="micro-label">{confirm.title}</span>
                        </div>
                        <div className="modal-body">
                            <p>{confirm.message}</p>
                        </div>
                        <div className="modal-footer" style={{ gap: '1rem' }}>
                            <button className="primary outline" style={{ flex: 1 }} onClick={() => handleConfirmResponse(false)}>
                                ABORT
                            </button>
                            <button className="primary" style={{ flex: 1 }} onClick={() => handleConfirmResponse(true)}>
                                EXECUTE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Prompt Modal */}
            {prompt?.visible && (
                <div className="terminal-modal-overlay">
                    <div className="terminal-modal card-glow prompt">
                        <div className="scanline"></div>
                        <div className="modal-header">
                            <Info size={18} color="var(--accent)" />
                            <span className="micro-label">{prompt.title}</span>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem' }}>{prompt.message}</p>
                            <input
                                autoFocus
                                type="text"
                                className="mono"
                                value={promptValue}
                                onChange={(e) => setPromptValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handlePromptResponse(promptValue);
                                    if (e.key === 'Escape') handlePromptResponse(null);
                                }}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--accent)',
                                    padding: '0.75rem',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <div className="modal-footer" style={{ gap: '1rem' }}>
                            <button className="primary outline" style={{ flex: 1 }} onClick={() => handlePromptResponse(null)}>
                                CANCEL
                            </button>
                            <button className="primary" style={{ flex: 1, background: 'var(--accent)' }} onClick={() => handlePromptResponse(promptValue)}>
                                SUBMIT
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className="terminal-toast">
                        <CheckCircle2 size={14} color="var(--success)" />
                        <span className="micro-label">{toast.message}</span>
                    </div>
                ))}
            </div>

            <style>{`
                .terminal-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(8px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    animation: fadeIn 0.2s ease-out;
                }
                .terminal-modal {
                    width: 100%;
                    max-width: 400px;
                    background: #0a0b13;
                    border: 1px solid var(--border-bright);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 0 50px rgba(0,0,0,0.5), 0 0 20px var(--primary-glow);
                }
                .terminal-modal.confirm {
                    border-color: var(--warning);
                    box-shadow: 0 0 50px rgba(0,0,0,0.5), 0 0 20px rgba(245, 158, 11, 0.2);
                }
                .modal-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    opacity: 0.8;
                }
                .modal-body {
                    margin-bottom: 2rem;
                }
                .modal-body p {
                    font-size: 1rem;
                    line-height: 1.6;
                    color: var(--text-main);
                    font-family: 'JetBrains Mono', monospace;
                }
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                }
                .modal-footer button {
                    padding: 1rem 2rem;
                    font-size: 0.8rem;
                    letter-spacing: 2px;
                }

                .toast-container {
                    position: fixed;
                    top: 2rem;
                    right: 2rem;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .terminal-toast {
                    background: rgba(10, 11, 19, 0.9);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--success);
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                    animation: slideInRight 0.3s cubic-bezier(0, 0, 0.2, 1);
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInRight { 
                    from { transform: translateX(100%); opacity: 0; } 
                    to { transform: translateX(0); opacity: 1; } 
                }
                
                @media (max-width: 480px) {
                    .toast-container { right: 1rem; left: 1rem; top: 1rem; }
                    .terminal-modal { padding: 1.25rem; max-width: 90vw; }
                    .modal-footer button { padding: 0.8rem 1rem; letter-spacing: 1px; }
                }

            `}</style>
        </TerminalContext.Provider>
    );
};

export const useTerminal = () => {
    const context = useContext(TerminalContext);
    if (!context) throw new Error("useTerminal must be used within TerminalProvider");
    return context;
};
