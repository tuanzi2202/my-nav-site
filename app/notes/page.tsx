import { getNotes } from '../actions'
import NotesWallClient from './client'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const notes = await getNotes()

  return (
    <div className="min-h-screen bg-[#0f172a] p-8 font-sans selection:bg-black/10 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <NotesWallClient initialNotes={notes} />
      </div>
    </div>
  )
}