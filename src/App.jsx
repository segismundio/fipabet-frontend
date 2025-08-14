import React, { useEffect, useState } from 'react'
import { api, loadSession, saveSession, clearSession } from './api.js'

export default function App(){
  const [session, setSession] = useState(loadSession())
  const [error, setError] = useState('')
  const [question, setQuestion] = useState(null)
  const [myAnswer, setMyAnswer] = useState(null)
  const [answersAdmin, setAnswersAdmin] = useState([])
  const me = session?.user || null

  useEffect(()=>{ saveSession(session) }, [session])
  useEffect(()=>{ refresh() }, [session?.token])

  async function refresh(){
    setError('')
    try{
      const q = await api.getCurrentQuestion()
      setQuestion(q)
      if(session?.token && q?.id){
        try{ const mine = await api.myAnswer(session.token, q.id); setMyAnswer(mine) }catch{}
        if(me?.isAdmin){ try{ const list = await api.answersByQuestion(session.token, q.id); setAnswersAdmin(list||[]) }catch{} }
      } else { setMyAnswer(null); setAnswersAdmin([]) }
    }catch{}
  }

  async function onRegister(username, password, adminInvite){
    try{ const data = await api.register(username, password, adminInvite||undefined); setSession({ token:data.token, user:data.user }); await refresh() }
    catch(e){ setError(e.message) }
  }
  async function onLogin(username, password){
    try{ const data = await api.login(username, password); setSession({ token:data.token, user:data.user }); await refresh() }
    catch(e){ setError(e.message) }
  }
  function onLogout(){ setSession(null); clearSession() }

  async function onCreateQuestion(payload){
    try{ await api.createQuestion(session.token, payload); await refresh() }
    catch(e){ setError(e.message) }
  }
  async function onSendAnswer(ans){
    try{ await api.sendAnswer(session.token, { questionId: question.id, answer: ans }); await refresh() }
    catch(e){ setError(e.message) }
  }

  return (
    <div>
      <header className="header">
        <div className="container flex space">
          <div className="flex">
            <strong>FIPABET</strong>
            <span className="badge">Q&A Inmutable</span>
          </div>
          <div className="small">
            {me ? (<>
              <span>{me.isAdmin? 'Admin':'Usuario'}: <b>{me.username}</b></span>
              <button className="btn secondary" onClick={onLogout} style={{marginLeft:8}}>Salir</button>
            </>) : <span>Accede o regístrate</span>}
          </div>
        </div>
      </header>

      <main className="container" style={{marginTop:16}}>
        <div className="grid grid-2">
          <AuthPanel loggedIn={!!me} onRegister={onRegister} onLogin={onLogin} />
          <QuestionPanel me={me} question={question} myAnswer={myAnswer} onCreate={onCreateQuestion} onAnswer={onSendAnswer} answersAdmin={answersAdmin} />
        </div>

        {error && (
          <div className="card" style={{marginTop:16, borderColor:'rgba(255,0,0,.2)'}}>
            <strong>Algo no fue bien</strong>
            <div className="small">{String(error)}</div>
          </div>
        )}

        <div className="small" style={{marginTop:24}}>
          Esta app sella cada respuesta con hash + timestamp y bloquea cualquier cambio mediante restricciones en la base de datos.
        </div>
      </main>
    </div>
  )
}

function AuthPanel({ onRegister, onLogin, loggedIn }){
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [adminInvite, setAdminInvite] = useState('')

  function submitLogin(e){ e.preventDefault(); onLogin(username, password) }
  function submitRegister(e){ e.preventDefault(); onRegister(username, password, adminInvite||undefined) }

  return (
    <div className="card">
      <div className="flex" style={{justifyContent:'space-between'}}>
        <h3>Acceso</h3>
        <div>
          <button className={`btn ${tab==='login'?'':'outline'}`} onClick={()=>setTab('login')}>Entrar</button>
          <button className={`btn ${tab==='register'?'':'outline'}`} onClick={()=>setTab('register')} style={{marginLeft:8}}>Registro</button>
        </div>
      </div>

      {tab==='login' ? (
        <form onSubmit={submitLogin} className="grid" style={{marginTop:12}}>
          <label className="label">Usuario</label>
          <input className="input" value={username} onChange={e=>setUsername(e.target.value)} required disabled={loggedIn} />
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={loggedIn} />
          <button className="btn" disabled={loggedIn} style={{marginTop:8}}>Entrar</button>
        </form>
      ) : (
        <form onSubmit={submitRegister} className="grid" style={{marginTop:12}}>
          <label className="label">Usuario</label>
          <input className="input" value={username} onChange={e=>setUsername(e.target.value)} required disabled={loggedIn} />
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={loggedIn} />
          <label className="label">Invitación admin (opcional)</label>
          <input className="input" value={adminInvite} onChange={e=>setAdminInvite(e.target.value)} placeholder="Código secreto" disabled={loggedIn} />
          <button className="btn" disabled={loggedIn} style={{marginTop:8}}>Crear cuenta</button>
        </form>
      )}
    </div>
  )
}

function QuestionPanel({ me, question, myAnswer, onCreate, onAnswer, answersAdmin }){
  const [text, setText] = useState('')
  const [type, setType] = useState('texto')
  const [options, setOptions] = useState('')
  const [answer, setAnswer] = useState('')

  function submitCreate(e){
    e.preventDefault()
    const opts = type==='opciones' ? options.split(',').map(s=>s.trim()).filter(Boolean) : []
    onCreate({ text, type, options: opts })
    setText(''); setOptions(''); setType('texto')
  }

  function submitAnswer(e){ e.preventDefault(); onAnswer(answer) }

  return (
    <div className="card">
      <h3>Pregunta y respuestas</h3>
      {me?.isAdmin && (
        <div className="card" style={{marginTop:12, background:'#0f1a37'}}>
          <div className="small" style={{marginBottom:8}}>Panel admin</div>
          <form onSubmit={submitCreate} className="grid">
            <label className="label">Texto de la pregunta</label>
            <input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="¿Quién ganará el partido?" />
            <div className="flex" style={{marginTop:6}}>
              <button type="button" className={`btn ${type==='texto'?'':'outline'}`} onClick={()=>setType('texto')}>Respuesta de texto</button>
              <button type="button" className={`btn ${type==='opciones'?'':'outline'}`} onClick={()=>setType('opciones')} style={{marginLeft:8}}>Selección entre opciones</button>
            </div>
            {type==='opciones' && (
              <>
                <label className="label" style={{marginTop:8}}>Opciones (separadas por comas)</label>
                <input className="input" value={options} onChange={e=>setOptions(e.target.value)} placeholder="Opción A, Opción B, Opción C" />
              </>
            )}
            <button className="btn" style={{marginTop:10}}>Publicar pregunta</button>
          </form>
        </div>
      )}

      <div style={{marginTop:12}}>
        {question ? (
          <>
            <div className="small">Pregunta activa · {new Date(question.createdAt).toLocaleString()}</div>
            <div style={{fontWeight:700, margin:'6px 0 10px'}}>{question.text}</div>
            {myAnswer ? (
              <div className="card" style={{background:'#0f1a37'}}>
                <div className="small">Tu respuesta está bloqueada</div>
                <div><b>Tu respuesta:</b> {myAnswer.answer}</div>
                <div className="small">Hash: <span className="mono">{String(myAnswer.hash).slice(0,16)}…</span></div>
              </div>
            ) : (
              <form onSubmit={submitAnswer} className="grid">
                {question.type==='texto' ? (
                  <>
                    <label className="label">Tu respuesta</label>
                    <input className="input" value={answer} onChange={e=>setAnswer(e.target.value)} required />
                  </>
                ) : (
                  <>
                    <label className="label">Selecciona una opción</label>
                    <select className="input" value={answer} onChange={e=>setAnswer(e.target.value)} required>
                      <option value="" disabled>— elige —</option>
                      {(question.options||[]).map((opt,i)=>(<option key={i} value={opt}>{opt}</option>))}
                    </select>
                  </>
                )}
                <button className="btn" style={{marginTop:8}}>Enviar y bloquear</button>
              </form>
            )}

            {me?.isAdmin && (
              <div className="card" style={{marginTop:12}}>
                <div className="small" style={{marginBottom:6}}>Respuestas recibidas ({answersAdmin?.length||0})</div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Respuesta</th>
                      <th>Fecha</th>
                      <th>Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!answersAdmin || answersAdmin.length===0) && (
                      <tr><td colSpan="4" className="center small">Aún no hay respuestas</td></tr>
                    )}
                    {answersAdmin?.map(a => (
                      <tr key={a.id}>
                        <td>{a.username}</td>
                        <td>{a.answer}</td>
                        <td>{new Date(a.createdAt).toLocaleString()}</td>
                        <td className="mono">{String(a.hash).slice(0,16)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="small">No hay pregunta activa todavía.</div>
        )}
      </div>
    </div>
  )
}
