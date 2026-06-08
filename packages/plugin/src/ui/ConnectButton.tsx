import React from 'react';

type Status = 'disconnected' | 'connecting' | 'connected';

interface Props {
  status: Status;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled: boolean;
}

export function ConnectButton({ status, onConnect, onDisconnect, disabled }: Props): React.ReactElement {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  if (isConnected || isConnecting) {
    return (
      <button
        className="connect-button disconnect"
        onClick={onDisconnect}
        disabled={false}
      >
        {isConnecting ? 'Cancel' : 'Disconnect'}
      </button>
    );
  }

  return (
    <button
      className="connect-button connect"
      onClick={onConnect}
      disabled={disabled}
    >
      Connect
    </button>
  );
}
