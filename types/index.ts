export type UserRole = 'admin' | 'user'
export type ScheduleStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado'
export type Turno = 'manha' | 'tarde' | 'noite'
export type NotificacaoTipo = 'agendamento' | 'login' | 'cancelamento'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Carrinho {
  id: string
  nome: string
  is_active: boolean
  created_at: string
}

export interface Local {
  id: string
  nome: string
  descricao: string | null
  is_active: boolean
  created_at: string
}

export interface Agendamento {
  id: string
  usuario_id: string
  carrinho_id: string
  local_id: string
  data: string
  turno: Turno
  status: ScheduleStatus
  observacao: string | null
  obs_admin: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  carrinhos?: Carrinho
  locais?: Local
}

export interface Notificacao {
  id: string
  tipo: NotificacaoTipo
  titulo: string
  mensagem: string
  usuario_id: string | null
  agendamento_id: string | null
  lida: boolean
  created_at: string
  profiles?: Profile
}

export const TURNOS: Record<Turno, { label: string; inicio: string; fim: string; emoji: string }> = {
  manha: { label: 'Manha',  inicio: '07:00', fim: '12:00', emoji: '🌅' },
  tarde: { label: 'Tarde',  inicio: '12:00', fim: '18:00', emoji: '☀️' },
  noite: { label: 'Noite',  inicio: '18:00', fim: '23:00', emoji: '🌙' },
}

export const STATUS_CONFIG: Record<ScheduleStatus, { label: string; bg: string; text: string; border: string }> = {
  pendente:  { label: 'Aguardando', bg: '#451a03', text: '#fbbf24', border: '#92400e' },
  aprovado:  { label: 'Aprovado',   bg: '#052e16', text: '#4ade80', border: '#166534' },
  recusado:  { label: 'Recusado',   bg: '#450a0a', text: '#f87171', border: '#991b1b' },
  cancelado: { label: 'Cancelado',  bg: '#18181b', text: '#71717a', border: '#3f3f46' },
}