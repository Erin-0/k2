import { Send, X, Bot, User } from 'lucide-react';
import type { Agent, ChatMessage } from '../types';

interface ChatInterfaceProps {
    agent: Agent;
    messages: ChatMessage[];
    input: string;
    isTyping: boolean;
    onInputChange: (val: string) => void;
    onSend: () => void;
    onClose: () => void;
}

export const ChatInterface = ({
    agent,
    messages,
    input,
    isTyping,
    onInputChange,
    onSend,
    onClose
}: ChatInterfaceProps) => {
    return (
        <div className="chat-interface fade-in">
            <div className="chat-interface__header">
                <div className="chat-interface__agent-info">
                    <div className="chat-interface__avatar v-clip-sm" style={{ borderColor: agent.color }}>
                        <img src={agent.image} alt={agent.name} />
                    </div>
                    <div>
                        <h3 className="chat-interface__name">{agent.name}</h3>
                        <span className="chat-interface__status">ارتباط عصبي نشط</span>
                    </div>
                </div>
                <button className="chat-interface__close" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="chat-interface__messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--agent'}`}>
                        <div className="chat-bubble__icon">
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className="chat-bubble__content v-clip-sm">
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="chat-bubble chat-bubble--agent">
                        <div className="chat-bubble__icon"><Bot size={14} /></div>
                        <div className="chat-bubble__content v-clip-sm typing-dots">
                            <span>.</span><span>.</span><span>.</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="chat-interface__footer">
                <div className="chat-interface__input-wrapper v-clip-sm">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onSend()}
                        placeholder="أرسل أمراً مشفراً..."
                    />
                    <button onClick={onSend} className="chat-interface__send">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
