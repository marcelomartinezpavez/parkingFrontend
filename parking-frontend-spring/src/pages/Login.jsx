
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin } from '../api.js'

export default function Login(){
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()

  /*const submit = (e)=>{
    e.preventDefault()
    apiLogin(username,password).then(()=> nav('/')).catch(()=> setErr('Usuario o contraseña inválidos'))
  }*/

  const submit = (e) => {
  e.preventDefault();
  apiLogin(username, password)
    .then((res) => {
      if (res === null) {
        setErr('Usuario o contraseña inválidos');
      } else {
        nav('/');
      }
    })
    .catch(() => setErr('Error al conectar con el servidor'));
};

  return (
    <div className='center-card'>
      <h1>Iniciar Sesión</h1>
      <form onSubmit={submit} className='row' style={{justifyContent:'center', gap:20, flexDirection:'column', alignItems:'center'}}>
        <div className='row'><span style={{width:160}}>Nombre de usuario</span><input className='input' value={username} onChange={e=>setU(e.target.value)} placeholder='Nombre de usuario' /></div>
        <div className='row'><span style={{width:160}}>Contraseña</span><input className='input' type='password' value={password} onChange={e=>setP(e.target.value)} placeholder='Contraseña' /></div>
        {err && <div style={{color:'#c0392b', fontWeight:700}}>{err}</div>}
        <button className='button'>Iniciar Sesión</button>
      </form>
    </div>
  )
}
