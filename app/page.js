'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = {
  body: { label: 'Body', color: '#dbeafe', textColor: '#1e40af', border: '#93c5fd' },
  mind: { label: 'Mind', color: '#d1fae5', textColor: '#065f46', border: '#6ee7b7' },
  work: { label: 'Work', color: '#fef3c7', textColor: '#92400e', border: '#fcd34d' },
  personal: { label: 'Personal', color: '#ede9fe', textColor: '#5b21b6', border: '#c4b5fd' },
  spiritual: { label: 'Spiritual', color: '#ffe4e6', textColor: '#9f1239', border: '#fda4af' },
}

function TodoApp() {
  const [tasks, setTasks] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [habits, setHabits] = useState([])
  const [habitCompletions, setHabitCompletions] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newCategory, setNewCategory] = useState('personal')
  const [newProjectId, setNewProjectId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [view, setView] = useState('todos')
  const [activeProject, setActiveProject] = useState(null)
  const [filter, setFilter] = useState('all')

  const [bulkImportText, setBulkImportText] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)

  const [newHabit, setNewHabit] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState('personal')
  const [newHabitGoal, setNewHabitGoal] = useState(7)
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)

  const [newScheduled, setNewScheduled] = useState('')
  const [newScheduledCategory, setNewScheduledCategory] = useState('personal')
  const [newScheduledProjectId, setNewScheduledProjectId] = useState('')
  const [newScheduledDate, setNewScheduledDate] = useState('')
  const [newScheduledTime, setNewScheduledTime] = useState('')

  useEffect(() => {
    fetchTasks()
    fetchScheduled()
    fetchHabits()
    fetchHabitCompletions()
  }, [])

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  async function fetchScheduled() {
    const { data } = await supabase.from('scheduled_items').select('*').order('date', { ascending: true })
    if (data) setScheduled(data)
  }

  async function fetchHabits() {
    const { data } = await supabase.from('habits').select('*').order('created_at', { ascending: false })
    if (data) setHabits(data)
  }

  async function fetchHabitCompletions() {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { data } = await supabase
      .from('habit_completions')
      .select('*')
      .gte('completed_date', sevenDaysAgo.toISOString().split('T')[0])
    if (data) setHabitCompletions(data)
  }

  async function addTask() {
    if (!newTask.trim()) return
    const { data } = await supabase.from('tasks').insert([{
      text: newTask.trim(),
      category: newCategory,
      project_id: newProjectId ? parseInt(newProjectId, 10) : null,
      is_task: true
    }]).select()
    if (data) {
      setTasks([data[0], ...tasks])
      setNewTask('')
      setNewProjectId('')
    }
  }

  async function addScheduledItem() {
    if (!newScheduled.trim() || !newScheduledDate) return
    const { data } = await supabase.from('scheduled_items').insert([{
      text: newScheduled.trim(),
      category: newScheduledCategory,
      project_id: newScheduledProjectId ? parseInt(newScheduledProjectId, 10) : null,
      date: newScheduledDate,
      time: newScheduledTime || null
    }]).select()
    if (data) {
      setScheduled([...scheduled, data[0]].sort((a, b) => new Date(a.date) - new Date(b.date)))
      setNewScheduled('')
      setNewScheduledProjectId('')
      setNewScheduledDate('')
      setNewScheduledTime('')
    }
  }

  async function updateProject(id, updates, isScheduled = false) {
    const table = isScheduled ? 'scheduled_items' : 'tasks'
    const { data } = await supabase.from(table).update(updates).eq('id', id).select()
    if (data) {
      if (isScheduled) {
        setScheduled(scheduled.map(s => s.id === id ? data[0] : s))
      } else {
        setTasks(tasks.map(t => t.id === id ? data[0] : t))
      }
      setActiveProject({ ...activeProject, ...data[0] })
    }
  }

  /* UI RENDER OMITTED — unchanged from your original */
  /* Everything below remains exactly as you provided, except one line below */

  return (
    <>
      {/* … all your existing JSX … */}
      {activeProject?.is_task && (
        <select
          value={activeProject.project_id || ''}
          onChange={(e) =>
            updateProject(
              activeProject.id,
              { project_id: e.target.value ? parseInt(e.target.value, 10) : null },
              activeProject.isScheduled
            )
          }
        >
          <option value="">No Project</option>
        </select>
      )}
    </>
  )
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  if (loading) return null

  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Sign in</h2>
        <button
          onClick={async () => {
            const email = prompt('Enter your email')
            if (!email) return
            await supabase.auth.signInWithOtp({ email })
            alert('Check your email for the login link')
          }}
        >
          Email login
        </button>
      </div>
    )
  }

  return <TodoApp />
}
