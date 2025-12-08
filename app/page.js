'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = {
  body: { label: 'Body', color: '#d1fae5', textColor: '#065f46', border: '#6ee7b7' },
  mind: { label: 'Mind', color: '#ede9fe', textColor: '#5b21b6', border: '#c4b5fd' },
  work: { label: 'Work', color: '#dbeafe', textColor: '#1e40af', border: '#93c5fd' },
  personal: { label: 'Personal', color: '#fef3c7', textColor: '#92400e', border: '#fcd34d' },
  spiritual: { label: 'Spiritual', color: '#ffe4e6', textColor: '#9f1239', border: '#fda4af' },
}

export default function Home() {
  const [tasks, setTasks] = useState([])
  const [scheduled, setScheduled] = useState([])
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
      is_task: true 
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
      time: newScheduledTime || null
    }]).select()
    if (data) {
      setScheduled([...scheduled, data[0]].sort((a,b) => new Date(a.date) - new Date(b.date)))
      setNewScheduled('')
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

  const styles = {
    container: { maxWidth: '700px', margin: '0 auto', padding: '24px', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    title: { fontSize: '24px', fontWeight: '600', color: '#1e293b' },
    viewToggle: { display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '8px', marginBottom: '24px', width: 'fit-content' },
    viewBtn: (active) => ({ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: active ? 'white' : 'transparent', color: active ? '#1e293b' : '#64748b', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }),
    categoryFilters: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' },
    catBtn: (active, color, border) => ({ padding: '8px 16px', borderRadius: '8px', border: active ? `2px solid ${border}` : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', background: active ? color : 'white', color: active ? '#1e293b' : '#64748b' }),
    focusBox: { background: 'linear-gradient(to right, #eef2ff, #f5f3ff)', borderRadius: '12px', border: '2px solid #c7d2fe', padding: '16px', marginBottom: '24px' },
    focusTitle: { fontSize: '18px', fontWeight: '600', color: '#312e81', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' },
    focusSubtitle: { fontSize: '12px', color: '#6366f1', marginBottom: '12px', opacity: 0.7 },
    focusItem: (isFirst) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: isFirst ? 'white' : 'rgba(255,255,255,0.6)', border: isFirst ? '2px solid #a5b4fc' : '1px solid #e0e7ff', marginBottom: '8px', cursor: 'pointer' }),
    focusNumber: (isFirst) => ({ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: isFirst ? '#4f46e5' : '#e0e7ff', color: isFirst ? 'white' : '#4f46e5', fontSize: isFirst ? '18px' : '14px' }),
    card: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    input
