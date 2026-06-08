import React, { useState, useEffect, useRef } from 'react';
import { wsClient } from './ws-client.js';
import { ConnectButton } from './ConnectButton.js';
import { StatusIndicator } from './StatusIndicator.js';

const DEFAULT_CHANNEL = 'default';

type Status = 'disconnected' | 'connecting' | 'connected';

export function App(): React.ReactElement {
  const [status, setStatus] = useState<Status>('disconnected');
  const [lastError, setLastError] = useState<string | undefined>();
  const autoConnected = useRef(false);

  useEffect(() => {
    wsClient.onStatus((s, err) => {
      setStatus(s);
      if (err) setLastError(err);
      if (s === 'connected') setLastError(undefined);
    });
    if (!autoConnected.current) {
      autoConnected.current = true;
      wsClient.connect(DEFAULT_CHANNEL);
    }
    return () => wsClient.destroy();
  }, []);

  function handleConnect(): void {
    setLastError(undefined);
    wsClient.connect(DEFAULT_CHANNEL);
  }

  function handleDisconnect(): void {
    wsClient.disconnect();
  }

  return (
    <div className="app">
      <span className="app-title">Effective ↔ Figma Bridge</span>
      <ConnectButton
        status={status}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        disabled={false}
      />
      <StatusIndicator status={status} {...(lastError !== undefined && { lastError })} />
    </div>
  );
}
