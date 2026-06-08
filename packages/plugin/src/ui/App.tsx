import React, { useState, useEffect } from 'react';
import { wsClient } from './ws-client.js';
import { ChannelInput } from './ChannelInput.js';
import { ConnectButton } from './ConnectButton.js';
import { StatusIndicator } from './StatusIndicator.js';

const CHANNEL_ID_RE = /^[a-f0-9]{32}$/;

type Status = 'disconnected' | 'connecting' | 'connected';

export function App(): React.ReactElement {
  const [channelId, setChannelId] = useState('');
  const [status, setStatus] = useState<Status>('disconnected');
  const [lastError, setLastError] = useState<string | undefined>();
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    wsClient.onStatus((s, err) => {
      setStatus(s);
      if (err) setLastError(err);
      if (s === 'connected') setLastError(undefined);
    });
    return () => wsClient.destroy();
  }, []);

  const isValidChannelId = CHANNEL_ID_RE.test(channelId);
  const isInvalid = showValidation && !isValidChannelId;

  function handleConnect(): void {
    setShowValidation(true);
    if (!isValidChannelId) return;
    setLastError(undefined);
    wsClient.connect(channelId);
  }

  function handleDisconnect(): void {
    wsClient.disconnect();
    setShowValidation(false);
  }

  return (
    <div className="app">
      <span className="app-title">Effective ↔ Figma Bridge</span>
      <ChannelInput
        value={channelId}
        onChange={(v) => { setChannelId(v); }}
        disabled={status !== 'disconnected'}
        isInvalid={isInvalid}
      />
      <ConnectButton
        status={status}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        disabled={showValidation && !isValidChannelId}
      />
      <StatusIndicator status={status} {...(lastError !== undefined && { lastError })} />
    </div>
  );
}
