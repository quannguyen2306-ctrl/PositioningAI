import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../contexts/AnalysisContext'
import type { AnalysisRequest } from '../api/types'

export function HomePage() {
  const navigate = useNavigate()
  const { startAnalysis } = useAnalysis()

  const [url, setUrl] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [serperKey, setSerperKey] = useState('')
  const [nCompetitors, setNCompetitors] = useState(10)
  const [nQuestions, setNQuestions] = useState(10)
  const [customQuestions, setCustomQuestions] = useState('')
  const [googleKey, setGoogleKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [perplexityKey, setPerplexityKey] = useState('')
  const [showEngineKeys, setShowEngineKeys] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFormValid = url.trim() && openaiKey.trim() && serperKey.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    setError(null)

    try {
      const customQuestionsArray = customQuestions
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0)

      const req: AnalysisRequest = {
        url: url.trim(),
        openai_key: openaiKey.trim(),
        serper_key: serperKey.trim(),
        google_key: googleKey.trim() || undefined,
        anthropic_key: anthropicKey.trim() || undefined,
        perplexity_key: perplexityKey.trim() || undefined,
        n_competitors: nCompetitors,
        n_questions: nQuestions,
        custom_questions: customQuestionsArray.length > 0 ? customQuestionsArray : undefined,
      }

      const sessionId = await startAnalysis(req)
      navigate(`/results/${sessionId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start analysis'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f1117',
        color: '#c9d1d9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '600px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '12px' }}>
            🔍 LLM Visibility Diagnostic
          </h1>
          <p style={{ fontSize: '16px', color: '#8b949e' }}>
            See how AI sees your business — and what to fix.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* URL Input */}
          <div>
            <label
              htmlFor="url"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#8b949e',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Your Website URL
            </label>
            <input
              id="url"
              type="url"
              placeholder="https://yourcompany.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#c9d1d9',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          {/* OpenAI Key */}
          <div>
            <label
              htmlFor="openaiKey"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#8b949e',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              OpenAI API Key
            </label>
            <input
              id="openaiKey"
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#c9d1d9',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          {/* Serper Key */}
          <div>
            <label
              htmlFor="serperKey"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#8b949e',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Serper API Key{' '}
              <a
                href="https://serper.dev"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#58a6ff', textDecoration: 'none', fontSize: '11px' }}
              >
                (Free at serper.dev)
              </a>
            </label>
            <input
              id="serperKey"
              type="password"
              placeholder="..."
              value={serperKey}
              onChange={e => setSerperKey(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#c9d1d9',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          {/* Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label
                htmlFor="nCompetitors"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#8b949e',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Competitors: {nCompetitors}
              </label>
              <input
                id="nCompetitors"
                type="range"
                min="5"
                max="20"
                value={nCompetitors}
                onChange={e => setNCompetitors(parseInt(e.target.value))}
                style={{ width: '100%' }}
                disabled={loading}
              />
              <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '4px' }}>
                5 - 20
              </div>
            </div>

            <div>
              <label
                htmlFor="nQuestions"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#8b949e',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Questions: {nQuestions}
              </label>
              <input
                id="nQuestions"
                type="range"
                min="5"
                max="15"
                value={nQuestions}
                onChange={e => setNQuestions(parseInt(e.target.value))}
                style={{ width: '100%' }}
                disabled={loading}
              />
              <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '4px' }}>
                5 - 15
              </div>
            </div>
          </div>

          {/* Multi-AI Engine Keys (Optional) */}
          <div>
            <button
              type="button"
              onClick={() => setShowEngineKeys(!showEngineKeys)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#8b949e',
                textTransform: 'uppercase',
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{showEngineKeys ? '−' : '+'}</span>
              Multi-AI Engine Keys (Optional)
              <span style={{ fontSize: '10px', fontWeight: 'normal', textTransform: 'none', marginLeft: 'auto' }}>
                Test across ChatGPT, Claude, Gemini, Perplexity
              </span>
            </button>

            {showEngineKeys && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingLeft: '12px', borderLeft: '2px solid #30363d' }}>
                <div>
                  <label htmlFor="anthropicKey" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b949e', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Anthropic API Key (Claude)
                  </label>
                  <input
                    id="anthropicKey"
                    type="password"
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={e => setAnthropicKey(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: '14px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', boxSizing: 'border-box' }}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="googleKey" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b949e', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Google API Key (Gemini)
                  </label>
                  <input
                    id="googleKey"
                    type="password"
                    placeholder="AIza..."
                    value={googleKey}
                    onChange={e => setGoogleKey(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: '14px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', boxSizing: 'border-box' }}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="perplexityKey" style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#8b949e', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Perplexity API Key
                  </label>
                  <input
                    id="perplexityKey"
                    type="password"
                    placeholder="pplx-..."
                    value={perplexityKey}
                    onChange={e => setPerplexityKey(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: '14px', backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#c9d1d9', boxSizing: 'border-box' }}
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom Questions */}
          <div>
            <label
              htmlFor="customQuestions"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#8b949e',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Custom Questions (Optional)
            </label>
            <textarea
              id="customQuestions"
              placeholder="One question per line..."
              value={customQuestions}
              onChange={e => setCustomQuestions(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#c9d1d9',
                boxSizing: 'border-box',
                minHeight: '80px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#da3633',
                border: '1px solid #f85149',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || loading}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: isFormValid && !loading ? '#238636' : '#30363d',
              color: isFormValid && !loading ? '#fff' : '#8b949e',
              border: 'none',
              borderRadius: '6px',
              cursor: isFormValid && !loading ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => {
              if (isFormValid && !loading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#2ea043'
              }
            }}
            onMouseLeave={e => {
              if (isFormValid && !loading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#238636'
              }
            }}
          >
            {loading ? 'Analysing...' : 'Analyse →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '48px', textAlign: 'center', color: '#8b949e', fontSize: '12px' }}>
          <p>
            This tool analyzes how LLMs perceive your business compared to competitors.
            <br />
            All analysis happens securely using your own API keys.
          </p>
        </div>
      </div>
    </div>
  )
}
