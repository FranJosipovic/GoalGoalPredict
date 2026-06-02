import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'
import MatchPredictPage from './pages/MatchPredictPage'
import MatchLivePage from './pages/MatchLivePage'
import TournamentPage from './pages/TournamentPage'
import TournamentTeamPage from './pages/TournamentTeamPage'
import PlayerDetailPage from './pages/PlayerDetailPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminGroups from './pages/admin/AdminGroups'
import AdminMatches from './pages/admin/AdminMatches'
import CreateSimMatch from './pages/admin/CreateSimMatch'
import AdminMatchDetail from './pages/admin/AdminMatchDetail'

const P = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>
const A = ({ children }: { children: React.ReactNode }) => <AdminRoute>{children}</AdminRoute>

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/groups" element={<P><GroupsPage /></P>} />
        <Route path="/groups/:id" element={<P><GroupDetailPage /></P>} />
        <Route path="/groups/:groupId/match/:matchId" element={<P><MatchPredictPage /></P>} />
        <Route path="/groups/:groupId/match/:matchId/live" element={<P><MatchLivePage /></P>} />
        <Route path="/groups/:groupId/player/:userId" element={<P><PlayerDetailPage /></P>} />
        <Route path="/tournament" element={<P><TournamentPage /></P>} />
        <Route path="/tournament/team/:teamId" element={<P><TournamentTeamPage /></P>} />
        {/* Admin */}
        <Route path="/admin" element={<A><AdminDashboard /></A>} />
        <Route path="/admin/groups" element={<A><AdminGroups /></A>} />
        <Route path="/admin/matches" element={<A><AdminMatches /></A>} />
        <Route path="/admin/matches/new" element={<A><CreateSimMatch /></A>} />
        <Route path="/admin/matches/:id" element={<A><AdminMatchDetail /></A>} />
        <Route path="*" element={<Navigate to="/groups" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
