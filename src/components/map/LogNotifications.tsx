import { motion, AnimatePresence } from 'motion/react';
import type { LogMessage } from './types';

interface LogNotificationsProps {
  logs: LogMessage[];
}

/** Animated overlay that shows recent dev-speak log notifications */
export function LogNotifications({ logs }: LogNotificationsProps) {
  return (
    <div
      id="dev-speak-logs-overlay"
      className="fixed top-4 left-4 z-50 pointer-events-none flex flex-col gap-2 max-w-70 sm:max-w-xs"
    >
      <AnimatePresence>
        {logs.map((log) => (
          <motion.div
            key={log.id}
            id={`dev-log-${log.id}`}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{
              opacity: 0, x: -20, scale: 0.95,
              transition: { duration: 0.2 },
            }}
            className="flex items-start gap-2 bg-[#1a1a1a]/95 text-white border-2 border-[#1a1a1a] p-2 sm:p-2.5 rounded shadow-lg pointer-events-auto font-mono text-[9px] sm:text-[10px] leading-tight"
            style={{ borderLeftColor: log.color, borderLeftWidth: '5px' }}
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1">
                <span
                  className="font-bold tracking-tight flex items-center gap-1"
                  style={{ color: log.color }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                    style={{ backgroundColor: log.color }}
                  />
                  {log.name}
                </span>
                <span className="text-white/45 text-[8px] whitespace-nowrap">
                  {log.timestamp}
                </span>
              </div>
              <p className="text-white/95 italic">"{log.message}"</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
