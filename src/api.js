const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function req(path, { method='GET', body, token } = {}){
  const headers = { 'Content-Type': 'application/json' }
  if(token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { method, headers, body: body?JSON.stringify(body):undefined })
  const data = await res.json().catch(()=>({}))
  if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  register: (username, password, adminInvite) => req('/api/auth/register', { method:'POST', body:{ username, password, adminInvite } }),
  login: (username, password) => req('/api/auth/login', { method:'POST', body:{ username, password } }),
  getCurrentQuestion: () => req('/api/question/current'),
  createQuestion: (token, payload) => req('/api/question', { method:'POST', body: payload, token }),
  sendAnswer: (token, payload) => req('/api/answers', { method:'POST', body: payload, token }),
  myAnswer: (token, qid) => req(`/api/answers/mine/${qid}`, { token }),
  answersByQuestion: (token, qid) => req(`/api/answers/by-question/${qid}`, { token }),
}

export function saveSession(session){ localStorage.setItem('fipabet_session', JSON.stringify(session||null)) }
export function loadSession(){ try{ return JSON.parse(localStorage.getItem('fipabet_session')) } catch { return null } }
export function clearSession(){ localStorage.removeItem('fipabet_session') }
