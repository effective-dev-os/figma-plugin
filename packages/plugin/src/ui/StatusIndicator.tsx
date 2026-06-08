import React from 'react';

type Status = 'disconnected' | 'connecting' | 'connected';

interface Props {
  status: Status;
  lastError?: string;
}

const STATUS_LABELS: Record<Status, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
};

export function StatusIndicator({ status, lastError }: Props): React.ReactElement {
  return (
    <div>
      <div className="status">
        <span className={`status-dot ${status}`} />
        <span>{STATUS_LABELS[status]}</span>
      </div>
      {lastError && status === 'disconnected' && (
        <div className="error-text">{lastError}</div>
      )}
    </div>
  );
}
