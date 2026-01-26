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
  const [newTask, setNewTask] = useState('')
  const [newCategory, setNewCategory] = useState('personal')
  const [newProjectId, setNewProjectId] = useState('')
  const [newScheduled, setNewScheduled] = useState('')
  const [newScheduledProjectId, setNewScheduledProjectId] = useState('')
  const [newScheduledDate, setNewScheduledDate] = useState('')

  useEffect(() => {
    fetchTasks()
    fetchScheduled()
  }, [])

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  async function fetchScheduled() {
    const { data } = await supabase.from('scheduled_items').select('*').order('date', { ascending: true })
    if (data) setScheduled(data)
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
      project_id: newScheduledProjectId ? parseInt(newScheduledProjectId, 10) : null,
      date: newScheduledDate
    }]).select()
    if (data) {
      setScheduled([...scheduled, data[0]])
      setNewScheduled('')
      setNewScheduledProjectId('')
      setNewScheduledDate('')
    }
  }

  const projects = tasks.filter(t => !t.is_task)
  const taskItems = tasks.filter(t => t.is_task)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>To-Do List</h1>

      <div style={{ marginBottom: 24 }}>
        <input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="New task"
          style={{ width: '100%', padding: 10, marginBottom: 8 }}
        />
        <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
          {Object.entries(CATEGORIES).map(([k, v]) =>
            <option key={k} value={k}>{v.label}</option>
          )}
        </select>
        <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.text}</option>)}
        </select>
        <button onClick={addTask}>Add Task</button>
      </div>

      <ul>
        {taskItems.map(t => (
          <li key={t.id}>
            {t.text}
            {t.project_id && (
              <span style={{ marginLeft: 8, opacity: 0.6 }}>
                (Project {t.project_id})
              </span>
            )}
          </li>
        ))}
      </ul>

      <hr />

      <h2>Scheduled</h2>
      <input value={newScheduled} onChange={e => setNewScheduled(e.target.value)} placeholder="Scheduled task" />
      <input type="date" value={newScheduledDate} onChange={e => setNewScheduledDate(e.target.value)} />
      <select value={newScheduledProjectId} onChange={e => setNewScheduledProjectId(e.target.value)}>
        <option value="">No project</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.text}</option>)}
      </select>
      <button onClick={addScheduledItem}>Add Scheduled</button>

      <ul>
        {scheduled.map(s => (
          <li key={s.id}>{s.text} — {s.date}</li>
        ))}
      </ul>
    </div>
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
