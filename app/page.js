'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import AuthForm from '../components/AuthForm'

const CATEGORIES = {
  body: { label: 'Body', color: '#dbeafe', textColor: '#1e40af', border: '#93c5fd' },
  mind: { label: 'Mind', color: '#d1fae5', textColor: '#065f46', border: '#6ee7b7' },
  work: { label: 'Work', color: '#fef3c7', textColor: '#92400e', border: '#fcd34d' },
  personal: { label: 'Personal', color: '#ede9fe', textColor: '#5b21b6', border: '#c4b5fd' },
  spiritual: { label: 'Spiritual', color: '#ffe4e6', textColor: '#9f1239', border: '#fda4af' },
}

const MOOD_COLORS = {
  horrible: '#dc2626',
  poor: '#f97316',
  okay: '#eab308',
  good: '#84cc16',
  excellent: '#22c55e'
}

const MOOD_VALUES = {
  horrible: 1,
  poor: 2,
  okay: 3,
  good: 4,
  excellent: 5
}

export default function Home() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '18px', color: '#64748b' }}>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return <TodoApp user={user} signOut={signOut} />
}

function TodoApp({ user, signOut }) {
  const [tasks, setTasks] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [habits, setHabits] = useState([])
  const [habitCompletions, setHabitCompletions] = useState([])
  const [exerciseMoods, setExerciseMoods] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newCategory, setNewCategory] = useState('personal')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [view, setView] = useState('todos')
  const [activeProject, setActiveProject] = useState(null)
  const [filter, setFilter] = useState('all')
  
  const [newScheduled, setNewScheduled] = useState('')
  const [newScheduledCategory, setNewScheduledCategory] = useState('personal')
  const [newScheduledDate, setNewScheduledDate] = useState('')
  const [newScheduledTime, setNewScheduledTime] = useState('')

  const [newHabit, setNewHabit] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState('personal')
  const [newHabitGoal, setNewHabitGoal] = useState(7)
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [trackExerciseMood, setTrackExerciseMood] = useState(false)

  const [showMoodPrompt, setShowMoodPrompt] = useState(false)
  const [moodHabitId, setMoodHabitId] = useState(null)
  const [moodBefore, setMoodBefore] = useState('')
  const [moodAfter, setMoodAfter] = useState('')
  const [moodNotes, setMoodNotes] = useState('')
  const [showMoodGraph, setShowMoodGraph] = useState(false)

  useEffect(() => {
    fetchTasks()
    fetchScheduled()
    fetchHabits()
    fetchHabitCompletions()
    fetchExerciseMoods()
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
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const { data } = await supabase
      .from('habit_completions')
      .select('*')
      .gte('completed_date', sevenDaysAgo.toISOString().split('T')[0])
    if (data) setHabitCompletions(data)
  }

  async function fetchExerciseMoods() {
    const { data } = await supabase
      .from('exercise_moods')
      .select('*')
      .order('completed_date', { ascending: true })
    if (data) setExerciseMoods(data)
  }

  async function addTask() {
    if (!newTask.trim()) return
    const { data } = await supabase.from('tasks').insert([{ 
      text: newTask.trim(), 
      category: newCategory,
      is_task: true,
      user_id: user.id
    }]).select()
    if (data) {
      setTasks([data[0], ...tasks])
      setNewTask('')
    }
  }

  async function addScheduledItem() {
    if (!newScheduled.trim() || !newScheduledDate) return
    const { data } = await supabase.from('scheduled_items').insert([{ 
      text: newScheduled.trim(), 
      category: newScheduledCategory,
      date: newScheduledDate,
      time: newScheduledTime || null,
      user_id: user.id
    }]).select()
    if (data) {
      setScheduled([...scheduled, data[0]].sort((a,b) => new Date(a.date) - new Date(b.date)))
      setNewScheduled('')
      setNewScheduledDate('')
      setNewScheduledTime('')
    }
  }

  async function addHabit() {
    if (!newHabit.trim()) return
    const { data } = await supabase.from('habits').insert([{
      text: newHabit.trim(),
      category: newHabitCategory,
      weekly_goal: newHabitGoal,
      track_exercise_mood: trackExerciseMood,
      user_id: user.id
    }]).select()
    if (data) {
      setHabits([data[0], ...habits])
      setNewHabit('')
      setNewHabitGoal(7)
      setTrackExerciseMood(false)
      setShowAddHabit(false)
    }
  }

  async function toggleComplete(id) {
    const task = tasks.find(t => t.id === id)
    const { data } = await supabase.from('tasks').update({ 
      completed: !task.completed,
      global_focus_order: task.completed ? task.global_focus_order : null,
      category_focus_order: task.completed ? task.category_focus_order : null
    }).eq('id', id).select()
    if (data) setTasks(tasks.map(t => t.id === id ? data[0] : t))
  }

  async function toggleScheduledComplete(id) {
    const item = scheduled.find(s => s.id === id)
    const { data } = await supabase.from('scheduled_items').update({ 
      completed: !item.completed 
    }).eq('id', id).select()
    if (data) setScheduled(scheduled.map(s => s.id === id ? data[0] : s))
  }

  async function toggleHabitCompletion(habitId) {
    const habit = habits.find(h => h.id === habitId)
    const today = new Date().toISOString().split('T')[0]
    const existing = habitCompletions.find(c => c.habit_id === habitId && c.completed_date === today)
    
    if (existing) {
      // Unchecking - remove completion and mood if exists
      await supabase.from('habit_completions').delete().eq('id', existing.id)
      await supabase.from('exercise_moods').delete().eq('habit_id', habitId).eq('completed_date', today)
      setHabitCompletions(habitCompletions.filter(c => c.id !== existing.id))
      setExerciseMoods(exerciseMoods.filter(m => !(m.habit_id === habitId && m.completed_date === today)))
    } else {
      // Checking - if this habit tracks exercise mood, show prompt
      if (habit.track_exercise_mood) {
        setMoodHabitId(habitId)
        setMoodBefore('')
        setMoodAfter('')
        setMoodNotes('')
        setShowMoodPrompt(true)
      } else {
        // Regular habit - just add completion
        const { data } = await supabase.from('habit_completions').insert([{
          habit_id: habitId,
          completed_date: today,
          user_id: user.id
        }]).select()
        if (data) setHabitCompletions([...habitCompletions, data[0]])
      }
    }
  }

  async function saveMoodAndCompletion() {
    if (!moodBefore || !moodAfter) {
      alert('Please select both before and after moods')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    
    // Add completion
    const { data: completionData } = await supabase.from('habit_completions').insert([{
      habit_id: moodHabitId,
      completed_date: today,
      user_id: user.id
    }]).select()
    
    // Add mood
    const { data: moodData } = await supabase.from('exercise_moods').insert([{
      habit_id: moodHabitId,
      completed_date: today,
      mood_before: moodBefore,
      mood_after: moodAfter,
      notes: moodNotes,
      user_id: user.id
    }]).select()
    
    if (completionData) setHabitCompletions([...habitCompletions, completionData[0]])
    if (moodData) setExerciseMoods([...exerciseMoods, moodData[0]])
    
    setShowMoodPrompt(false)
    setMoodHabitId(null)
    setMoodBefore('')
    setMoodAfter('')
    setMoodNotes('')
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
    if (activeProject?.id === id) setActiveProject(null)
  }

  async function deleteScheduled(id) {
    await supabase.from('scheduled_items').delete().eq('id', id)
    setScheduled(scheduled.filter(s => s.id !== id))
    if (activeProject?.id === id) setActiveProject(null)
  }

  async function deleteHabit(id) {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(habits.filter(h => h.id !== id))
  }

  async function updateHabit(id, updates) {
    const { data } = await supabase.from('habits').update(updates).eq('id', id).select()
    if (data) {
      setHabits(habits.map(h => h.id === id ? data[0] : h))
      setEditingHabit(null)
    }
  }

  async function setFocusOrder(taskId, order) {
    const orderNum = order === '' ? null : parseInt(order)
    const isGlobal = categoryFilter === 'all'
    const task = tasks.find(t => t.id === taskId)
    
    if (orderNum !== null) {
      const field = isGlobal ? 'global_focus_order' : 'category_focus_order'
      const conflicting = tasks.find(t => 
        t.id !== taskId && 
        (isGlobal ? t.global_focus_order === orderNum : (t.category === task.category && t.category_focus_order === orderNum))
      )
      if (conflicting) {
        await supabase.from('tasks').update({ [field]: null }).eq('id', conflicting.id)
      }
    }
    
    const updateField = isGlobal ? { global_focus_order: orderNum } : { category_focus_order: orderNum }
    const { data } = await supabase.from('tasks').update(updateField).eq('id', taskId).select()
    if (data) {
      let newTasks = tasks.map(t => t.id === taskId ? data[0] : t)
      if (orderNum !== null) {
        const field = isGlobal ? 'global_focus_order' : 'category_focus_order'
        newTasks = newTasks.map(t => {
          if (t.id !== taskId && (isGlobal ? t.global_focus_order === orderNum : (t.category === task.category && t.category_focus_order === orderNum))) {
            return { ...t, [field]: null }
          }
          return t
        })
      }
      setTasks(newTasks)
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

  async function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id)
    const { data } = await supabase.from('tasks').update({ is_task: !task.is_task }).eq('id', id).select()
    if (data) setTasks(tasks.map(t => t.id === id ? data[0] : t))
  }

  function getHabitProgress(habitId, weeklyGoal) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const completionsForHabit = habitCompletions.filter(c => 
      c.habit_id === habitId && 
      new Date(c.completed_date) >= sevenDaysAgo
    )
    const completed = completionsForHabit.length
    const percentage = weeklyGoal > 0 ? Math.round((completed / weeklyGoal) * 100) : 0
    return { completed, weeklyGoal, percentage }
  }

  const getFocusOrder = (task) => categoryFilter === 'all' ? task.global_focus_order : task.category_focus_order
  
  const focusQueue = categoryFilter === 'all'
    ? tasks.filter(t => t.global_focus_order !== null && !t.completed && t.is_task).sort((a, b) => a.global_focus_order - b.global_focus_order)
    : tasks.filter(t => t.category === categoryFilter && t.category_focus_order !== null && !t.completed && t.is_task).sort((a, b) => a.category_focus_order - b.category_focus_order)

  const activeTasks = tasks.filter(t => t.is_task)
  const projects = tasks.filter(t => !t.is_task)
  
  const otherTasks = activeTasks
    .filter(t => filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed)
    .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
    .filter(t => getFocusOrder(t) === null || t.completed)

  const filteredProjects = projects.filter(p => categoryFilter === 'all' || p.category === categoryFilter)
  const filteredHabits = habits.filter(h => categoryFilter === 'all' || h.category === categoryFilter)
  
  const usedOrders = categoryFilter === 'all'
    ? activeTasks.filter(t => t.global_focus_order !== null && !t.completed).map(t => t.global_focus_order)
    : activeTasks.filter(t => t.category === categoryFilter && t.category_focus_order !== null && !t.completed).map(t => t.category_focus_order)

  const formatDate = (dateStr) => new Date(dateStr + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`
  }

  // Mood graph data preparation
  const moodGraphData = exerciseMoods.map(m => ({
    date: new Date(m.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    before: MOOD_VALUES[m.mood_before],
    after: MOOD_VALUES[m.mood_after]
  }))

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>To-Do List</h1>
        <button 
          onClick={signOut}
          style={{ 
            padding: '8px 16px', 
            background: '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontSize: '14px', 
            fontWeight: '500' 
          }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '8px', marginBottom: '24px', width: 'fit-content' }}>
        <button onClick={() => setView('todos')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: view === 'todos' ? 'white' : 'transparent', color: view === 'todos' ? '#1e293b' : '#64748b' }}>To-Do List</button>
        <button onClick={() => setView('projects')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: view === 'projects' ? 'white' : 'transparent', color: view === 'projects' ? '#1e293b' : '#64748b' }}>Projects ({projects.length})</button>
        <button onClick={() => setView('habits')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: view === 'habits' ? 'white' : 'transparent', color: view === 'habits' ? '#1e293b' : '#64748b' }}>Habits ({habits.length})</button>
      </div>

      {view === 'todos' ? (
        <>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => setCategoryFilter('all')} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === 'all' ? '2px solid #4f46e5' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === 'all' ? '#eef2ff' : 'white', color: '#1e293b' }}>All</button>
            {Object.entries(CATEGORIES).map(([key, { label, color, border }]) => (
              <button key={key} onClick={() => setCategoryFilter(key)} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === key ? `2px solid ${border}` : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === key ? color : 'white', color: '#1e293b' }}>{label}</button>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(to right, #eef2ff, #f5f3ff)', borderRadius: '12px', border: '2px solid #c7d2fe', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#312e81', marginBottom: '4px' }}>🎯 Current Deadline(s)</div>
            <div style={{ fontSize: '12px', color: '#6366f1', marginBottom: '12px', opacity: 0.7 }}>{categoryFilter === 'all' ? 'Top 5 priorities across all categories' : `Top 5 priorities within ${CATEGORIES[categoryFilter]?.label}`}</div>
            {focusQueue.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#6366f1', opacity: 0.7 }}>Assign numbers 1-5 to tasks below to set current deadlines.</p>
            ) : (
              focusQueue.map((task, i) => (
                <div key={task.id} onClick={() => setActiveProject({ ...task, isScheduled: false })} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: i === 0 ? 'white' : 'rgba(255,255,255,0.6)', border: i === 0 ? '2px solid #a5b4fc' : '1px solid #e0e7ff', marginBottom: '8px', cursor: 'pointer' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: i === 0 ? '#4f46e5' : '#e0e7ff', color: i === 0 ? 'white' : '#4f46e5', fontSize: i === 0 ? '18px' : '14px' }}>{getFocusOrder(task)}</span>
                  <input type="checkbox" checked={task.completed} onChange={(e) => { e.stopPropagation(); toggleComplete(task.id) }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: CATEGORIES[task.category]?.color, color: CATEGORIES[task.category]?.textColor, border: `1px solid ${CATEGORIES[task.category]?.border}` }}>{CATEGORIES[task.category]?.label}</span>
                  <span style={{ flex: 1, fontWeight: i === 0 ? '500' : '400' }}>{task.text}</span>
                  {task.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                  <button onClick={(e) => { e.stopPropagation(); setFocusOrder(task.id, '') }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>✕</button>
                </div>
              ))
            )}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '12px' }}>Add New Task</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="What needs to be done?" style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
              <button onClick={addTask} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Add</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Category:</span>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                {Object.entries(CATEGORIES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>

                  <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '24px', marginTop: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>📅 Scheduled Tasks</h2>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '12px' }}>Add Scheduled Task</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input value={newScheduled} onChange={(e) => setNewScheduled(e.target.value)} placeholder="What's scheduled?" style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                <button onClick={addScheduledItem} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Add</button>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Category:</span>
                  <select value={newScheduledCategory} onChange={(e) => setNewScheduledCategory(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                    {Object.entries(CATEGORIES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Date:</span>
                  <input type="date" value={newScheduledDate} onChange={(e) => setNewScheduledDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Time:</span>
                  <input type="time" value={newScheduledTime} onChange={(e) => setNewScheduledTime(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                </div>
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {scheduled.length === 0 ? (
                <p style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No scheduled tasks yet.</p>
              ) : (
                scheduled.map(item => (
                  <div key={item.id} onClick={() => setActiveProject({ ...item, isScheduled: true })} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <input type="checkbox" checked={item.completed} onChange={(e) => { e.stopPropagation(); toggleScheduledComplete(item.id) }} onClick={(e) => e.stopPropagation()} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: CATEGORIES[item.category]?.color, color: CATEGORIES[item.category]?.textColor, border: `1px solid ${CATEGORIES[item.category]?.border}` }}>{CATEGORIES[item.category]?.label}</span>
                    <span style={{ flex: 1, fontSize: '14px', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#9ca3af' : '#374151' }}>{item.text}</span>
                    {item.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                    <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{formatDate(item.date)}{item.time && ` · ${formatTime(item.time)}`}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteScheduled(item.id) }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>
              
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            {['all', 'active', 'completed'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', background: filter === f ? '#2563eb' : '#e2e8f0', color: filter === f ? 'white' : '#475569', textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase' }}>Backlog</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{categoryFilter === 'all' ? 'Setting global priority' : `Setting ${CATEGORIES[categoryFilter]?.label} priority`}</span>
            </div>
            {otherTasks.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No tasks yet. Add one above!</p>
            ) : (
              otherTasks.map(task => (
                <div key={task.id} onClick={() => setActiveProject({ ...task, isScheduled: false })} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  <select value={getFocusOrder(task) || ''} onChange={(e) => { e.stopPropagation(); setFocusOrder(task.id, e.target.value) }} onClick={(e) => e.stopPropagation()} disabled={task.completed} style={{ width: '50px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', fontSize: '14px' }}>
                    <option value="">—</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n} disabled={usedOrders.includes(n)}>{n}</option>)}
                  </select>
                  <input type="checkbox" checked={task.completed} onChange={(e) => { e.stopPropagation(); toggleComplete(task.id) }} onClick={(e) => e.stopPropagation()} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: CATEGORIES[task.category]?.color, color: CATEGORIES[task.category]?.textColor, border: `1px solid ${CATEGORIES[task.category]?.border}` }}>{CATEGORIES[task.category]?.label}</span>
                  <span style={{ flex: 1, fontSize: '14px', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#9ca3af' : '#374151' }}>{task.text}</span>
                  {task.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                  {task.notes && <span style={{ color: '#9ca3af', fontSize: '12px' }}>📎</span>}
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>Delete</button>
                </div>
              ))
            )}
          </div>

        </>
      ) : view === 'projects' ? (
        <>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '12px' }}>Create New Project</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Project name..." style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
              <button onClick={() => { if(newTask.trim()) { supabase.from('tasks').insert([{ text: newTask.trim(), category: newCategory, is_task: false, user_id: user.id }]).select().then(({data}) => { if(data) { setTasks([data[0], ...tasks]); setNewTask('') }}) }}} style={{ padding: '10px 16px', background: '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Create</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Category:</span>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                {Object.entries(CATEGORIES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => setCategoryFilter('all')} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === 'all' ? '2px solid #475569' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === 'all' ? '#f1f5f9' : 'white', color: '#1e293b' }}>All</button>
            {Object.entries(CATEGORIES).map(([key, { label, color, border }]) => (
              <button key={key} onClick={() => setCategoryFilter(key)} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === key ? `2px solid ${border}` : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === key ? color : 'white', color: '#1e293b' }}>{label}</button>
            ))}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase' }}>Projects (not on to-do list yet)</span>
            </div>
            {filteredProjects.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No projects yet. Create one above!</p>
            ) : (
              filteredProjects.map(project => (
                <div key={project.id} onClick={() => setActiveProject({ ...project, isScheduled: false })} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: CATEGORIES[project.category]?.color, color: CATEGORIES[project.category]?.textColor, border: `1px solid ${CATEGORIES[project.category]?.border}` }}>{CATEGORIES[project.category]?.label}</span>
                  <span style={{ flex: 1, fontSize: '14px' }}>{project.text}</span>
                  {project.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                  {project.notes && <span style={{ color: '#9ca3af', fontSize: '12px' }}>📎</span>}
                  <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(project.id) }} style={{ padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Add to To-Do</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(project.id) }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>Delete</button>
                </div>
              ))
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '16px' }}>Projects are containers for related work. Add them to your to-do list when you're ready. ✦ = linked to Claude Project</p>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => setCategoryFilter('all')} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === 'all' ? '2px solid #10b981' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === 'all' ? '#d1fae5' : 'white', color: '#1e293b' }}>All</button>
            {Object.entries(CATEGORIES).map(([key, { label, color, border }]) => (
              <button key={key} onClick={() => setCategoryFilter(key)} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === key ? `2px solid ${border}` : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === key ? color : 'white', color: '#1e293b' }}>{label}</button>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(to right, #d1fae5, #a7f3d0)', borderRadius: '12px', border: '2px solid #6ee7b7', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#065f46', marginBottom: '4px' }}>✅ Daily Habits</div>
                <div style={{ fontSize: '12px', color: '#059669', opacity: 0.8 }}>Rolling 7-day tracking · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
              <button onClick={() => setShowAddHabit(!showAddHabit)} style={{ padding: '8px 16px', background: showAddHabit ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>{showAddHabit ? 'Cancel' : '+ Add Habit'}</button>
            </div>

            {showAddHabit && (
              <div style={{ background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <input value={newHabit} onChange={(e) => setNewHabit(e.target.value)} placeholder="Habit name..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <select value={newHabitCategory} onChange={(e) => setNewHabitCategory(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                    {Object.entries(CATEGORIES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>Weekly Goal:</span>
                  <input type="number" min="1" max="7" value={newHabitGoal} onChange={(e) => setNewHabitGoal(parseInt(e.target.value))} style={{ width: '60px', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }} />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>days/week</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={trackExerciseMood} onChange={(e) => setTrackExerciseMood(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontSize: '14px', color: '#475569' }}>Track mood before/after (for exercise)</span>
                  </label>
                </div>
                <button onClick={addHabit} style={{ width: '100%', padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Create Habit</button>
              </div>
            )}

            {filteredHabits.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#059669', textAlign: 'center', padding: '16px' }}>No habits yet. Click "+ Add Habit" to create one!</p>
            ) : (
              filteredHabits.map(habit => {
                const today = new Date().toISOString().split('T')[0]
                const isCompleted = habitCompletions.some(c => c.habit_id === habit.id && c.completed_date === today)
                const { completed, weeklyGoal, percentage } = getHabitProgress(habit.id, habit.weekly_goal)
                const metGoal = completed >= weeklyGoal
                const hasMoodData = exerciseMoods.some(m => m.habit_id === habit.id)

                return editingHabit?.id === habit.id ? (
                  <div key={habit.id} style={{ background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <input value={editingHabit.text} onChange={(e) => setEditingHabit({ ...editingHabit, text: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <select value={editingHabit.category} onChange={(e) => setEditingHabit({ ...editingHabit, category: e.target.value })} style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                        {Object.entries(CATEGORIES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>Weekly Goal:</span>
                      <input type="number" min="1" max="7" value={editingHabit.weekly_goal} onChange={(e) => setEditingHabit({ ...editingHabit, weekly_goal: parseInt(e.target.value) })} style={{ width: '60px', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }} />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>days/week</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => updateHabit(habit.id, { text: editingHabit.text, category: editingHabit.category, weekly_goal: editingHabit.weekly_goal })} style={{ flex: 1, padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Save</button>
                      <button onClick={() => setEditingHabit(null)} style={{ flex: 1, padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={habit.id} style={{ background: 'white', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="checkbox" checked={isCompleted} onChange={() => toggleHabitCompletion(habit.id)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: CATEGORIES[habit.category]?.color, color: CATEGORIES[habit.category]?.textColor, border: `1px solid ${CATEGORIES[habit.category]?.border}` }}>{CATEGORIES[habit.category]?.label}</span>
                      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{habit.text} {habit.track_exercise_mood && '💭'}</span>
                      <span style={{ fontSize: '13px', color: metGoal ? '#059669' : '#64748b', fontWeight: '500' }}>{completed}/{weeklyGoal} {metGoal && '✅'}</span>
                      <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{percentage}%</span>
                      {habit.track_exercise_mood && hasMoodData && (
                        <button onClick={() => { setMoodHabitId(habit.id); setShowMoodGraph(true) }} style={{ padding: '4px 10px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📊 Mood</button>
                      )}
                      <button onClick={() => setEditingHabit({ id: habit.id, text: habit.text, category: habit.category, weekly_goal: habit.weekly_goal })} style={{ padding: '4px 10px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                      <button onClick={() => deleteHabit(habit.id)} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>✕</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Mood Prompt Modal */}
      {showMoodPrompt && (
        <>
          <div onClick={() => setShowMoodPrompt(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '12px', padding: '24px', zIndex: 100, maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>How did you feel?</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>Before Exercise:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['horrible', 'poor', 'okay', 'good', 'excellent'].map(mood => (
                  <button key={mood} onClick={() => setMoodBefore(mood)} style={{ flex: 1, minWidth: '60px', padding: '10px', borderRadius: '8px', border: moodBefore === mood ? '2px solid #1e293b' : '1px solid #e2e8f0', background: moodBefore === mood ? MOOD_COLORS[mood] : 'white', color: moodBefore === mood ? 'white' : '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: '500', textTransform: 'capitalize' }}>
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>After Exercise:</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['horrible', 'poor', 'okay', 'good', 'excellent'].map(mood => (
                  <button key={mood} onClick={() => setMoodAfter(mood)} style={{ flex: 1, minWidth: '60px', padding: '10px', borderRadius: '8px', border: moodAfter === mood ? '2px solid #1e293b' : '1px solid #e2e8f0', background: moodAfter === mood ? MOOD_COLORS[mood] : 'white', color: moodAfter === mood ? 'white' : '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: '500', textTransform: 'capitalize' }}>
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>Notes (optional):</div>
              <textarea 
                value={moodNotes} 
                onChange={(e) => setMoodNotes(e.target.value)} 
                placeholder="How was the workout? Any thoughts?" 
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveMoodAndCompletion} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Save</button>
              <button onClick={() => setShowMoodPrompt(false)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Mood Graph Modal */}
      {showMoodGraph && moodHabitId && (
        <>
          <div onClick={() => setShowMoodGraph(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '12px', padding: '24px', zIndex: 100, maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Exercise Mood Trends</h3>
              <button onClick={() => setShowMoodGraph(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>

            {moodGraphData.filter(d => exerciseMoods.find(m => m.habit_id === moodHabitId && new Date(m.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === d.date)).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No mood data yet. Complete exercise with mood tracking to see trends.</p>
            ) : (
              <div style={{ position: 'relative', height: '300px', marginBottom: '20px' }}>
                <svg width="100%" height="300" viewBox="0 0 550 300" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f9fafb' }}>
                  {/* Y-axis labels */}
                  {[1, 2, 3, 4, 5].map(val => (
                    <g key={val}>
                      <line x1="40" y1={260 - (val - 1) * 50} x2="530" y2={260 - (val - 1) * 50} stroke="#e5e7eb" strokeWidth="1" />
                      <text x="25" y={265 - (val - 1) * 50} fontSize="12" fill="#64748b" textAnchor="end">{val}</text>
                    </g>
                  ))}

                  {/* Data points and lines */}
                  {(() => {
                    const filteredData = moodGraphData.filter(d => exerciseMoods.find(m => m.habit_id === moodHabitId && new Date(m.completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === d.date))
                    const spacing = filteredData.length > 1 ? 480 / (filteredData.length - 1) : 0
                    
                    return (
                      <>
                        {/* Before line */}
                        {filteredData.length > 1 && (
                          <polyline
                            points={filteredData.map((d, i) => `${50 + i * spacing},${260 - (d.before - 1) * 50}`).join(' ')}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                        )}
                        
                        {/* After line */}
                        {filteredData.length > 1 && (
                          <polyline
                            points={filteredData.map((d, i) => `${50 + i * spacing},${260 - (d.after - 1) * 50}`).join(' ')}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                          />
                        )}

                        {/* Points */}
                        {filteredData.map((d, i) => (
                          <g key={i}>
                            {/* Before point */}
                            <circle cx={50 + i * spacing} cy={260 - (d.before - 1) * 50} r="5" fill="#3b82f6" />
                            {/* After point */}
                            <circle cx={50 + i * spacing} cy={260 - (d.after - 1) * 50} r="5" fill="#10b981" />
                            {/* X-axis label */}
                            <text x={50 + i * spacing} y="285" fontSize="11" fill="#64748b" textAnchor="middle">{d.date}</text>
                          </g>
                        ))}
                      </>
                    )
                  })()}
                </svg>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '20px', height: '3px', background: '#3b82f6' }} />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Before Exercise</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '20px', height: '3px', background: '#10b981' }} />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>After Exercise</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mood entries with notes */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginBottom: '12px' }}>Workout Notes:</div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {exerciseMoods
                  .filter(m => m.habit_id === moodHabitId)
                  .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))
                  .map(mood => (
                    <div key={mood.id} style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>
                          {new Date(mood.completed_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: MOOD_COLORS[mood.mood_before], color: 'white' }}>
                            Before: {mood.mood_before}
                          </span>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: MOOD_COLORS[mood.mood_after], color: 'white' }}>
                            After: {mood.mood_after}
                          </span>
                        </div>
                      </div>
                      {mood.notes && (
                        <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: 0 }}>{mood.notes}</p>
                      )}
                      {!mood.notes && (
                        <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>No notes</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Mood scale reference */}
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px', marginTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '8px' }}>Mood Scale:</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                  <div key={mood} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: '20px', background: color, borderRadius: '4px', marginBottom: '4px' }} />
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{mood}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeProject && (
        <>
          <div onClick={() => setActiveProject(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '500px', height: '100%', background: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 100, overflowY: 'auto' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: CATEGORIES[activeProject.category]?.color, color: CATEGORIES[activeProject.category]?.textColor, border: `1px solid ${CATEGORIES[activeProject.category]?.border}` }}>{CATEGORIES[activeProject.category]?.label}</span>
                {activeProject.isScheduled && <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(activeProject.date)}</span>}
              </div>
              <button onClick={() => setActiveProject(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ padding: '16px' }}>
              <input value={activeProject.text} onChange={(e) => updateProject(activeProject.id, { text: e.target.value }, activeProject.isScheduled)} placeholder="Task name..." style={{ width: '100%', fontSize: '20px', fontWeight: '600', border: 'none', outline: 'none', marginBottom: '16px' }} />

              {!activeProject.isScheduled && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={activeProject.is_task} onChange={() => { toggleTaskStatus(activeProject.id); setActiveProject({ ...activeProject, is_task: !activeProject.is_task }) }} style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontSize: '14px', color: '#475569' }}>Show on To-Do List</span>
                  </label>
                </div>
              )}

              {!activeProject.isScheduled && activeProject.is_task && (
                <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '8px', border: '1px solid #c7d2fe', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#4338ca', textTransform: 'uppercase', marginBottom: '8px' }}>Current Priority</div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                    <span><span style={{ color: '#6366f1' }}>Global:</span> {activeProject.global_focus_order || '—'}</span>
                    <span><span style={{ color: '#6366f1' }}>{CATEGORIES[activeProject.category]?.label}:</span> {activeProject.category_focus_order || '—'}</span>
                  </div>
                </div>
              )}

              <div style={{ background: 'linear-gradient(to right, #fff7ed, #fffbeb)', padding: '16px', borderRadius: '8px', border: '1px solid #fed7aa', marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#c2410c', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>✦ Claude Project</label>
                <input value={activeProject.claude_project_url || ''} onChange={(e) => updateProject(activeProject.id, { claude_project_url: e.target.value }, activeProject.isScheduled)} placeholder="https://claude.ai/project/..." style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', marginTop: '8px' }} />
                {activeProject.claude_project_url && <a href={activeProject.claude_project_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#c2410c', marginTop: '8px', display: 'inline-block' }}>Open Claude Project →</a>}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Other Link</label>
                <input value={activeProject.link || ''} onChange={(e) => updateProject(activeProject.id, { link: e.target.value }, activeProject.isScheduled)} placeholder="https://..." style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }} />
                {activeProject.link && <a href={activeProject.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#2563eb', marginTop: '8px', display: 'inline-block' }}>Open link →</a>}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Notes</label>
                <textarea value={activeProject.notes || ''} onChange={(e) => updateProject(activeProject.id, { notes: e.target.value }, activeProject.isScheduled)} placeholder="Add notes, context, or details..." style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', minHeight: '120px', resize: 'vertical' }} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
