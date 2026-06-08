import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  isInvalid: boolean;
}

export function ChannelInput({ value, onChange, disabled, isInvalid }: Props): React.ReactElement {
  return (
    <div className="input-group">
      <span className="input-label">Channel ID</span>
      <input
        type="text"
        className={`channel-input${isInvalid ? ' invalid' : ''}`}
        value={value}
        placeholder="32-character hex token"
        disabled={disabled}
        maxLength={32}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
