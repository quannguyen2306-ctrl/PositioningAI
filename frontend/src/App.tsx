import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnalysisProvider } from './contexts/AnalysisContext'
import { PreFillProvider } from './hooks/usePreFillForm.tsx'
import HomePage from './pages/HomePage'
import ResultsPage from './pages/ResultsPage'

function App() {
  return (
    <PreFillProvider>
      <AnalysisProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/results/:sessionId" element={<ResultsPage />} />
          </Routes>
        </Router>
      </AnalysisProvider>
    </PreFillProvider>
  )
}

export default App
