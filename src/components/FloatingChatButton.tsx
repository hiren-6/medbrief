import React from 'react';
import { MessageSquare } from 'lucide-react';

interface FloatingChatButtonProps {
	onClick: () => void;
	disabled?: boolean;
	label?: string;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onClick, disabled, label }) => {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-label={label || 'Open consultation chat'}
			className="fixed bottom-6 right-6 z-[70] inline-flex items-center justify-center h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white hover:from-blue-500 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
		>
			<MessageSquare className="h-6 w-6" />
		</button>
	);
};

export default FloatingChatButton;


