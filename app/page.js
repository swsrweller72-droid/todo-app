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

// SET YOUR PASSWORD HERE - CHANGE THIS!
const APP_PASSWORD = '4Iowlbnaf4!'

function TodoApp() {
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
      if (orderNum !== n
