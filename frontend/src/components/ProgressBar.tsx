interface ProgressBarProps {
  percent: number
  message: string
}

export function ProgressBar({ percent, message }: ProgressBarProps) {
  return (
    <div style={{ padding: '20px', width: '100%' }}>
      <div style={{ marginBottom: '12px', color: '#c9d1d9', fontSize: '14px' }}>
        {message}
      </div>
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#30363d',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            backgroundColor: '#238636',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ marginTop: '8px', color: '#8b949e', fontSize: '12px', textAlign: 'right' }}>
        {percent}%
      </div>
    </div>
  )
}
