
import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'

function RequireAuth({ children }){
  const session = localStorage.getItem('token')
  if (!session) return <Navigate to='/login' replace />
  return children
}

export default function App(){
  return (
    <div>
      <div className='header'>Estacionamiento</div>
      <Routes>
        <Route path='/login' element={<Login/>} />
        <Route path='/' element={<Dashboard/>} />
        <Route path='/historial' element={<History/>} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </div>
  )
}
