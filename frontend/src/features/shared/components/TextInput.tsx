import type React from 'react';

/**
 * Props for the TextInput component.
 * Extends standard HTML input attributes.
 */
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  /**
   * If true, applies error styling.
   * @default false
   */
  error?: boolean;
}

/**
 * A styled text input component.
 */
const TextInput: React.FC<TextInputProps> = ({ className = '', error, ...props }) => {
  return (
    <input
      type="text"
      className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white font-mono focus:ring-1 transition-all placeholder-gray-600 ${
        error
          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50'
          : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
      } ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    />
  );
};

export default TextInput;
