'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PasswordGate from '../components/PasswordGate'

const CATEGORIES = {
  body: { label: 'Body', color: '#d1fae5', textColor: '#065f46', border: '#6ee7b7' },
  mind: { label: 'Mind', color: '#ede9fe', textColor: '#5b21b6', border: '#c4b5fd' },
  work: { label: 'Work', color: '#dbeafe', textColor: '#1e40af', border: '#93c5fd' },
  personal: { label: 'Personal', color: '#fef3c7', textColor: '#92400e', border: '#fcd34d' },
  spiritual: { label: 'Spiritual', color: '#ffe4e6', textColor: '#9f1239', border: '#fda4af' },
}

const APP_PASSWORD = '4Iowlbnaf4!'

function TodoApp() {
  const [tasks, setTasks] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newCategory, setNewCategory] = useState('personal')
  const [newProjectId, setNewProjectId] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [view, setView] = useState('todos')
  const [activeProject, setActiveProject] = useState(null)
  const [filter, setFilter] = useState('all')
  
  const [newScheduled, setNewScheduled] = useState('')
  const [newScheduledCategory, setNewScheduledCategory] = useState('personal')
  const [newScheduledProjectId, setNewScheduledProjectId] = useState('')
  const [newScheduledDate, setNewScheduledDate] = useState('')
  const [newScheduledTime, setNewScheduledTime] = useState('')

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
      project_id: newProjectId || null,
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
      project_id: newScheduledProjectId || null,
      date: newScheduledDate,
      time: newScheduledTime || null
    }]).select()
    if (data) {
      setScheduled([...scheduled, data[0]].sort((a,b) => new Date(a.date) - new Date(b.date)))
      setNewScheduled('')
      setNewScheduledProjectId('')
      setNewScheduledDate('')
      setNewScheduledTime('')
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

  const getFocusOrder = (task) => categoryFilter === 'all' ? task.global_focus_order : task.category_focus_order
  
  const activeTasks = tasks.filter(t => t.is_task)
  const projects = tasks.filter(t => !t.is_task)
  
  const getProjectName = (projectId) => {
    if (!projectId) return null
    const project = projects.find(p => p.id === projectId)
    return project ? project.text : null
  }

  const focusQueue = categoryFilter === 'all'
    ? activeTasks.filter(t => t.global_focus_order !== null && !t.completed && (projectFilter === 'all' || (projectFilter === 'none' ? !t.project_id : t.project_id === parseInt(projectFilter)))).sort((a, b) => a.global_focus_order - b.global_focus_order)
    : activeTasks.filter(t => t.category === categoryFilter && t.category_focus_order !== null && !t.completed && (projectFilter === 'all' || (projectFilter === 'none' ? !t.project_id : t.project_id === parseInt(projectFilter)))).sort((a, b) => a.category_focus_order - b.category_focus_order)
  
  const otherTasks = activeTasks
    .filter(t => filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed)
    .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
    .filter(t => projectFilter === 'all' || (projectFilter === 'none' ? !t.project_id : t.project_id === parseInt(projectFilter)))
    .filter(t => getFocusOrder(t) === null || t.completed)

  const filteredProjects = projects.filter(p => categoryFilter === 'all' || p.category === categoryFilter)
  
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

  const getProjectTaskCount = (projectId) => {
    return activeTasks.filter(t => t.project_id === projectId && !t.completed).length
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>To-Do List</h1>
      </div>

      <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '8px', marginBottom: '24px', width: 'fit-content' }}>
        <button onClick={() => setView('todos')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: view === 'todos' ? 'white' : 'transparent', color: view === 'todos' ? '#1e293b' : '#64748b' }}>To-Do List</button>
        <button onClick={() => setView('projects')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: view === 'projects' ? 'white' : 'transparent', color: view === 'projects' ? '#1e293b' : '#64748b' }}>Projects ({projects.length})</button>
      </div>

      {view === 'todos' ? (
        <>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <button onClick={() => setCategoryFilter('all')} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === 'all' ? '2px solid #4f46e5' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === 'all' ? '#eef2ff' : 'white', color: '#1e293b' }}>All</button>
            {Object.entries(CATEGORIES).map(([key, { label, color, border }]) => (
              <button key={key} onClick={() => setCategoryFilter(key)} style={{ padding: '8px 16px', borderRadius: '8px', border: categoryFilter === key ? `2px solid ${border}` : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: categoryFilter === key ? color : 'white', color: '#1e293b' }}>{label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => setProjectFilter('all')} style={{ padding: '6px 12px', borderRadius: '6px', border: projectFilter === 'all' ? '2px solid #64748b' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: projectFilter === 'all' ? '#f1f5f9' : 'white', color: '#1e293b' }}>All Projects</button>
            <button onClick={() => setProjectFilter('none')} style={{ padding: '6px 12px', borderRadius: '6px', border: projectFilter === 'none' ? '2px solid #64748b' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: projectFilter === 'none' ? '#f1f5f9' : 'white', color: '#1e293b' }}>No Project</button>
            {projects.map(project => (
              <button key={project.id} onClick={() => setProjectFilter(project.id.toString())} style={{ padding: '6px 12px', borderRadius: '6px', border: projectFilter === project.id.toString() ? '2px solid #64748b' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: projectFilter === project.id.toString() ? '#f1f5f9' : 'white', color: '#1e293b' }}>{project.text} ({getProjectTaskCount(project.id)})</button>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(to right, #eef2ff, #f5f3ff)', borderRadius: '12px', border: '2px solid #c7d2fe', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#312e81', marginBottom: '4px' }}>🎯 Focus Queue</div>
            <div style={{ fontSize: '12px', color: '#6366f1', marginBottom: '12px', opacity: 0.7 }}>{categoryFilter === 'all' ? 'Top 5 priorities across all categories' : `Top 5 priorities within ${CATEGORIES[categoryFilter]?.label}`}</div>
            {focusQueue.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#6366f1', opacity: 0.7 }}>Assign numbers 1-5 to tasks below to build your focus queue.</p>
            ) : (
              focusQueue.map((task, i) => (
                <div key={task.id} onClick={() => setActiveProject({ ...task, isScheduled: false })} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: i === 0 ? 'white' : 'rgba(255,255,255,0.6)', border: i === 0 ? '2px solid #a5b4fc' : '1px solid #e0e7ff', marginBottom: '8px', cursor: 'pointer' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: i === 0 ? '#4f46e5' : '#e0e7ff', color: i === 0 ? 'white' : '#4f46e5', fontSize: i === 0 ? '18px' : '14px' }}>{getFocusOrder(task)}</span>
                  <input type="checkbox" checked={task.completed} onChange={(e) => { e.stopPropagation(); toggleComplete(task.id) }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: CATEGORIES[task.category]?.color, color: CATEGORIES[task.category]?.textColor, border: `1px solid ${CATEGORIES[task.category]?.border}` }}>{CATEGORIES[task.category]?.label}</span>
                  {task.project_id && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>📁 {getProjectName(task.project_id)}</span>}
                  <span style={{ flex: 1, fontWeight: i === 0 ? '500' : '400' }}>{task.text}</span>
                  {task.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                  <button onClick={(e) => { e.stopPropagation(); setFocusOrder(task.id, '') }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>✕</button>
                </div>
              ))
            )}
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>📅 Today&apos;s Agenda</div>
            <iframe 
              src="https://calendar.google.com/calendar/embed?height=400&wkst=1&ctz=America%2FNew_York&showTitle=0&showNav=0&showDate=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA&src=t48coeb3n8ntunlmj3ou05pbog%40group.calendar.google.com" 
              style={{ border: 0, width: '100%', height: '400px', borderRadius: '8px' }} 
              frameBorder="0" 
              scrolling="no"
            />
          </div>

          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '12px' }}>Add New Task</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="What needs to be done?" style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
              <button onClick={addTask} style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Add</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Category:</span>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                {Object.entries(CATEGORIES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>Project:</span>
              <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                <option value="">None</option>
                {projects.map(project => <option key={project.id} value={project.id}>{project.text}</option>)}
              </select>
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
                  {task.project_id && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>📁 {getProjectName(task.project_id)}</span>}
                  <span style={{ flex: 1, fontSize: '14px', textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#9ca3af' : '#374151' }}>{task.text}</span>
                  {task.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                  {task.notes && <span style={{ color: '#9ca3af', fontSize: '12px' }}>📎</span>}
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>Delete</button>
                </div>
              ))
            )}
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
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Project:</span>
                  <select value={newScheduledProjectId} onChange={(e) => setNewScheduledProjectId(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
                    <option value="">None</option>
                    {projects.map(project => <option key={project.id} value={project.id}>{project.text}</option>)}
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
                    {item.project_id && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>📁 {getProjectName(item.project_id)}</span>}
                    <span style={{ flex: 1, fontSize: '14px', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#9ca3af' : '#374151' }}>{item.text}</span>
                    {item.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                    <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{formatDate(item.date)}{item.time && ` · ${formatTime(item.time)}`}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteScheduled(item.id) }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '12px' }}>Create New Project</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Project name..." style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
              <button onClick={() => { if(newTask.trim()) { supabase.from('tasks').insert([{ text: newTask.trim(), category: newCategory, is_task: false }]).select().then(({data}) => { if(data) { setTasks([data[0], ...tasks]); setNewTask('') }}) }}} style={{ padding: '10px 16px', background: '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Create</button>
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
                  <span style={{ flex: 1, fontSize: '14px' }}>{project.text} <span style={{ color: '#64748b', fontSize: '12px' }}>({getProjectTaskCount(project.id)} tasks)</span></span>
                  {project.claude_project_url && <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c', fontWeight: '500' }}>✦</span>}
                  {project.notes && <span style={{ color: '#9ca3af', fontSize: '12px' }}>📎</span>}
                  <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(project.id) }} style={{ padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Add to To-Do</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(project.id) }} style={{ padding: '4px 8px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.5 }}>Delete</button>
                </div>
              ))
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '16px' }}>Projects are containers for related work. Add them to your to-do list when you&apos;re ready. Tasks can be assigned to projects. ✦ = linked to Claude Project</p>
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

              {activeProject.is_task && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Assign to Project</label>
                  <select value={activeProject.project_id || ''} onChange={(e) => updateProject(activeProject.id, { project_id: e.target.value || null }, activeProject.isScheduled)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}>
                    <option value="">No Project</option>
                    {projects.map(project => <option key={project.id} value={project.id}>{project.text}</option>)}
                  </select>
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

export default function Home() {
  return (
    <PasswordGate correctPassword={APP_PASSWORD}>
      <TodoApp />
    </PasswordGate>
  )
}
