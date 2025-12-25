'use client'
import { useState } from 'react'

export default function PasswordGate({ children, correctPassword }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === correctPassword) {
      setIsAuthenticated(true)
      setError(false)
    } else {
      setError(true)
      setPassword('')
    }
  }

  if (isAuthenticated) {
    return children
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f8fafc'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#1e293b', 
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          🔒 Focus To-Do
        </h1>
        <p style={{ 
          fontSize: '14px', 
          color: '#64748b', 
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Enter password to continue
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              marginBottom: '16px'
            }}
          />
          
          {error && (
            <p style={{ 
              color: '#ef4444', 
              fontSize: '14px', 
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              Incorrect password. Please try again.
            </p>
          )}
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
