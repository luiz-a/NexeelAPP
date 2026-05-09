import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import type { Agendamento, ScheduleStatus, Turno } from '@/types'
import { TURNOS, STATUS_CONFIG } from '@/types'

const STATUS_FILTROS: { value: ScheduleStatus | 'todos'; label: string }[] = [
  { value: 'todos',     label: 'Todos'     },
  { value: 'pendente',  label: 'Pendentes' },
  { value: 'aprovado',  label: 'Aprovados' },
  { value: 'recusado',  label: 'Recusados' },
  { value: 'cancelado', label: 'Cancelados'},
]

export default function AgendamentosScreen() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<ScheduleStatus | 'todos'>('todos')
  const [filtroTurno, setFiltroTurno] = useState<Turno | 'todos'>('todos')

  const carregar = async () => {
    const { data } = await (supabase as any)
      .from('agendamentos')
      .select('*, profiles(full_name, email), carrinhos(nome), locais(nome)')
      .order('data', { ascending: false })
      .limit(100)
    setAgendamentos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await carregar()
    setRefreshing(false)
  }, [])

  const handleCancelar = (id: string) => {
    Alert.alert('Cancelar', 'Cancelar este agendamento?', [
      { text: 'Nao', style: 'cancel' },
      {
        text: 'Cancelar', style: 'destructive',
        onPress: async () => {
          await (supabase as any).from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
          setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a))
        }
      }
    ])
  }

  const filtrados = agendamentos.filter(a => {
    if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
    if (filtroTurno  !== 'todos' && a.turno  !== filtroTurno)  return false
    return true
  })

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
      <ActivityIndicator size="large" color="#f59e0b" />
    </View>
  )

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
    >
      <View style={{ padding: 20, paddingTop: 56 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>📋 Agendamentos</Text>
        <Text style={{ color: '#71717a', fontSize: 13, marginTop: 2 }}>{filtrados.length} registros</Text>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {/* Filtro status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {STATUS_FILTROS.map(f => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFiltroStatus(f.value as any)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: filtroStatus === f.value ? '#f59e0b' : '#27272a' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: filtroStatus === f.value ? '#000' : '#a1a1aa' }}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Filtro turno */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['todos', 'manha', 'tarde', 'noite'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setFiltroTurno(t)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: filtroTurno === t ? '#f59e0b' : '#27272a' }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: filtroTurno === t ? '#000' : '#a1a1aa' }}>
                  {t === 'todos' ? 'Todos turnos' : `${TURNOS[t].emoji} ${TURNOS[t].label}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Lista */}
        <View style={{ gap: 8, paddingBottom: 32 }}>
          {filtrados.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#71717a' }}>Nenhum agendamento encontrado.</Text>
            </View>
          ) : filtrados.map(a => {
            const turno = TURNOS[a.turno]
            const status = STATUS_CONFIG[a.status]
            return (
              <View key={a.id} style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#f59e0b', fontWeight: '600', fontSize: 13 }}>
                      {format(parseISO(a.data), 'dd/MM/yyyy')} · {turno.emoji} {turno.label}
                    </Text>
                    <Text style={{ color: '#fff', fontWeight: '500', marginTop: 3 }}>{(a as any).profiles?.full_name}</Text>
                    <Text style={{ color: '#71717a', fontSize: 12, marginTop: 1 }}>
                      {(a as any).carrinhos?.nome} · {(a as any).locais?.nome}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: status.bg, borderWidth: 1, borderColor: status.border, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                    <Text style={{ color: status.text, fontSize: 11, fontWeight: '500' }}>{status.label}</Text>
                  </View>
                </View>
                {a.status === 'aprovado' && (
                  <TouchableOpacity onPress={() => handleCancelar(a.id)} style={{ marginTop: 8 }}>
                    <Text style={{ color: '#ef4444', fontSize: 12 }}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}