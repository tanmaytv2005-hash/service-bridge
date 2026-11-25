import { useEffect, useState } from 'react';

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState('');

  useEffect(() => {
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setInstalled(Boolean(isStandalone));
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); setHelp(''); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    setHelp('');
    if (!installPrompt) {
      const isAppleMobile = /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
      setHelp(isAppleMobile
        ? 'In Safari, tap Share, then choose “Add to Home Screen”. Open that icon to enable phone alerts.'
        : 'Open your browser menu (⋮ or Share) and choose “Install app” or “Add to Home screen”.');
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result?.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <span className="install-app-wrap">
      <button type="button" className="btn ghost install-app-btn" onClick={install}>Add to phone</button>
      {help && <span className="install-app-help" role="status">{help}</span>}
    </span>
  );
}
