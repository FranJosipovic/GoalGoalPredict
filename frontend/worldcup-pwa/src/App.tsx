import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import InvitePage from './pages/InvitePage'
import GroupsPage from './pages/GroupsPage'
import ProfilePage from './pages/ProfilePage'
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
import AdminSync from './pages/admin/AdminSync'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import AdminAllGroups from './pages/admin/AdminAllGroups'
import AdminGroupDetail from './pages/admin/AdminGroupDetail'

const P = ({ children }: { children: React.ReactNode }) => <ProtectedRoute>{children}</ProtectedRoute>
const A = ({ children }: { children: React.ReactNode }) => <AdminRoute>{children}</AdminRoute>

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route path="/groups" element={<P><GroupsPage /></P>} />
        <Route path="/profile" element={<P><ProfilePage /></P>} />
        <Route path="/groups/:id" element={<P><GroupDetailPage /></P>} />
        <Route path="/groups/:id/:tab" element={<P><GroupDetailPage /></P>} />
        <Route path="/groups/:groupId/match/:matchId" element={<P><MatchPredictPage /></P>} />
        <Route path="/groups/:groupId/match/:matchId/live" element={<P><MatchLivePage /></P>} />
        <Route path="/groups/:groupId/player/:userId" element={<P><PlayerDetailPage /></P>} />
        <Route path="/tournament" element={<P><TournamentPage /></P>} />
        <Route path="/tournament/team/:teamId" element={<P><TournamentTeamPage /></P>} />
        {/* Admin */}
        <Route path="/admin" element={<A><AdminDashboard /></A>} />
        <Route path="/admin/sync" element={<A><AdminSync /></A>} />
        <Route path="/admin/users" element={<A><AdminUsers /></A>} />
        <Route path="/admin/users/:id" element={<A><AdminUserDetail /></A>} />
        <Route path="/admin/all-groups" element={<A><AdminAllGroups /></A>} />
        <Route path="/admin/all-groups/:id" element={<A><AdminGroupDetail /></A>} />
        <Route path="/admin/groups" element={<A><AdminGroups /></A>} />
        <Route path="/admin/matches" element={<A><AdminMatches /></A>} />
        <Route path="/admin/matches/new" element={<A><CreateSimMatch /></A>} />
        <Route path="/admin/matches/:id" element={<A><AdminMatchDetail /></A>} />
        <Route path="*" element={<Navigate to="/groups" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
