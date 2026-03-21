import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnalysisProvider } from './contexts/AnalysisContext'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'

function App() {
  return (
    <AnalysisProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results/:sessionId" element={<ResultsPage />} />
        </Routes>
      </Router>
    </AnalysisProvider>
  )
}

export default App
