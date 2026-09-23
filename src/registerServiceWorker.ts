import { registerSW } from 'virtual:pwa-register';

/**
 * Service Worker Registration & Cache Management
 * Implements PWA Offline App Shell with "Prompt for Update" pattern
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        // Create a fixed DOM element for the update prompt
        const promptDiv = document.createElement('div');
        promptDiv.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900 border border-blue-500/50 shadow-2xl rounded-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-8 w-[90%] max-w-sm';
        
        const text = document.createElement('p');
        text.className = 'text-sm text-white font-medium text-center';
        text.textContent = 'Versi terbaru NEXA15 telah tersedia.';
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'flex gap-2 justify-center';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors flex-1';
        cancelBtn.textContent = 'Nanti';
        cancelBtn.onclick = () => {
          promptDiv.remove();
        };

        const updateBtn = document.createElement('button');
        updateBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex-1 shadow-lg shadow-blue-500/20';
        updateBtn.textContent = 'Perbarui Sekarang';
        updateBtn.onclick = () => {
          updateSW(true);
        };
        
        btnGroup.appendChild(cancelBtn);
        btnGroup.appendChild(updateBtn);
        
        promptDiv.appendChild(text);
        promptDiv.appendChild(btnGroup);
        
        document.body.appendChild(promptDiv);
      },
      onOfflineReady() {
        // App is ready to work offline, no aggressive UI needed for now.
        console.log('NEXA15 is ready for offline use.');
      },
    });
  }
}
