import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AgentPage } from './pages/AgentPage'
import { EnterprisePage } from './pages/EnterprisePage'
import { ParentsPage } from './pages/ParentsPage'
import { StudentsPage } from './pages/StudentsPage'
import { TeachersPage } from './pages/TeachersPage'
import { UniversitiesPage } from './pages/UniversitiesPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/agent" replace />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/vuzy" element={<UniversitiesPage />} />
        <Route path="/uchenik" element={<StudentsPage />} />
        <Route path="/roditeli" element={<ParentsPage />} />
        <Route path="/uchitelya" element={<TeachersPage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="*" element={<Navigate to="/agent" replace />} />
      </Route>
    </Routes>
  )
}
