import { Route, Routes } from 'react-router-dom'
import ArchiveHome from './pages/ArchiveHome'
import Destination from './pages/Destination'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ArchiveHome />} />
      <Route path="/:slug" element={<Destination />} />
    </Routes>
  )
}
