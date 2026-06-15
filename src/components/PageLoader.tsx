import React from 'react';
import { Coffee } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/20 dark:bg-black/35 backdrop-blur-md transition-all duration-300">
      <div className="relative flex flex-col items-center p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/40 shadow-xl max-w-xs w-full text-center">
        <div className="relative flex items-center justify-center size-16 mb-3">
          {/* Animated gradient outer ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-amber-500/10 border-t-amber-500 animate-spin" />
          
          {/* Thematic coffee icon pulsing in the center */}
          <Coffee className="size-6 text-amber-600 dark:text-amber-500 animate-pulse" />
        </div>
        
        <h3 className="text-zinc-800 dark:text-zinc-200 font-extrabold text-sm tracking-tight leading-none">
          Loading Page
        </h3>
        <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1.5 animate-pulse">
          Preparing content...
        </p>
      </div>
    </div>
  );
};

export default PageLoader;
