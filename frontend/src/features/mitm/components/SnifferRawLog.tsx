import type React from 'react';

/**
 * Props for SnifferRawLog.
 */
interface SnifferRawLogProps {
  /**
   * List of raw log entries to display.
   */
  logs: { id: string; text: string }[];
  /**
   * Whether this view is currently visible.
   */
  visible: boolean;
  /**
   * Ref to the end of the log list, for auto-scrolling.
   */
  logEndRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Helper to strip ANSI escape codes from log strings.
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  // biome-ignore lint/complexity/useRegexLiterals: Avoiding control characters in regex literal lint
  const ansiRegex = new RegExp(
    '[\\u001b\\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]',
    'g',
  );
  return str.replace(ansiRegex, '');
}

function getLogColor(log: string): string {
  const cleanLog = stripAnsi(log);
  if (cleanLog.includes('INFO')) return 'text-cyan-400';
  if (cleanLog.includes('WARNING')) return 'text-yellow-400';
  if (cleanLog.includes('ERROR') || cleanLog.includes('Error:')) return 'text-red-400';
  if (cleanLog.includes('Starting')) return 'text-green-400';
  return 'text-gray-300';
}

/**
 * Component to display raw log text with syntax highlighting (colors based on log level).
 */
const SnifferRawLog: React.FC<SnifferRawLogProps> = ({ logs, visible, logEndRef }) => {
  return (
    <div
      className={`absolute inset-0 p-4 overflow-y-auto font-mono text-xs space-y-1 ${
        visible ? 'block' : 'hidden'
      }`}
    >
      {logs.length === 0 && (
        <div className="text-gray-500 italic text-center mt-10">No logs captured yet...</div>
      )}
      {logs.map((log) => (
        <div
          key={log.id}
          className={`${getLogColor(log.text)} break-all border-b border-gray-800/30 pb-0.5`}
        >
          {stripAnsi(log.text)}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  );
};

export default SnifferRawLog;
