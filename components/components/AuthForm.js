'use client'
import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await signIn(email)

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(to bottom right, #eef2ff, #f5f3ff)',
      padding: '24px'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
        maxWidth: '400px', 
        width: '100%' 
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b', marginBottom: '8px', textAlign: 'center' }}>
          Focus To-Do
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px', textAlign: 'center' }}>
          Sign in to access your tasks
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '8px', display: 'block' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '16px',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: loading ? '#94a3b8' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: message.includes('Error') ? '#fee2e2' : '#d1fae5',
            color: message.includes('Error') ? '#991b1b' : '#065f46',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '24px', textAlign: 'center' }}>
          No password needed! We'll send you a magic link to sign in.
        </p>
      </div>
    </div>
  )
}
