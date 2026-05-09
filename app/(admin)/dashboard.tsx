import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Agendamento } from '@/types'
import { STATUS_CONFIG, TURNOS } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

export default function DashboardScreen() {
  const router = useRouter()
  const { profile, reset } = useAuthStore()
  const [pendentes, setPendentes] = useState<Agendamento[]>([])
  const [hoje, setHoje] = useState<Agendamento[]>([])
  const [stats, setStats] = useState({ usuarios: 0, carrinhos: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const carregar = async () => {
    const dataHoje = format(new Date(), 'yyyy-MM-dd')

    const [
      { data: pend },
      { data: agHoje },
      { count: totalUsuarios },
      { count: totalCarrinhos },
    ] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('*, profiles(full_name, email), carrinhos(nome), locais(nome)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false }) as any,

      supabase
        .from('agendamentos')
        .select('*, profiles(full_name), carrinhos(nome), locais(nome)')
        .eq('data', dataHoje)
        .in('status', ['pendente', 'aprovado'])
        .order('turno') as any,

      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')
        .eq('is_active', true),

      supabase
        .from('carrinhos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    setPendentes(pend ?? [])
    setHoje(agHoje ?? [])
    setStats({ usuarios: totalUsuarios ?? 0, carrinhos: totalCarrinhos ?? 0 })
    setLoading(false)
  }

  useEffect(() => {
    carregar()

    // Realtime
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos' },
        () => carregar()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await carregar()
    setRefreshing(false)
  }, [])

  const handleAprovar = async (id: string) => {
    await (supabase as any)
      .from('agendamentos')
      .update({ status: 'aprovado' })
      .eq('id', id)
    setPendentes(prev => prev.filter(a => a.id !== id))
  }

  const handleRecusar = async (id: string) => {
    Alert.alert('Recusar', 'Confirma recusar este agendamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Recusar', style: 'destructive',
        onPress: async () => {
          await (supabase as any)
            .from('agendamentos')
            .update({ status: 'recusado' })
            .eq('id', id)
          setPendentes(prev => prev.filter(a => a.id !== id))
        }
      }
    ])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    reset()
    router.replace('/login')
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
    >
      {/* Header */}
      <View style={{ padding: 20, paddingTop: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>🛒</Text>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>Dashboard</Text>
            <Text style={{ fontSize: 12, color: '#71717a' }}>Ola, {profile?.full_name?.split(' ')[0]}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: '#71717a', fontSize: 13 }}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16, gap: 20 }}>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard label="Usuarios" value={stats.usuarios} cor="#3b82f6" />
          <StatCard label="Carrinhos" value={stats.carrinhos} cor="#14b8a6" />
          <StatCard label="Hoje" value={hoje.length} cor="#22c55e" />
          <StatCard label="Pendentes" value={pendentes.length} cor="#f59e0b" />
        </View>

        {/* Agenda de hoje */}
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#e4e4e7', marginBottom: 12 }}>
            📅 Hoje — {format(new Date(), "d 'de' MMM", { locale: ptBR })}
          </Text>
          {hoje.length === 0 ? (
            <Vazio texto="Nenhum agendamento para hoje." />
          ) : (
            hoje.map(a => {
              const turno = TURNOS[a.turno]
              const status = STATUS_CONFIG[a.status]
              return (
                <View key={a.id} style={{
                  backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a',
                  borderRadius: 16, padding: 14, marginBottom: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}>
                  <Text style={{ fontSize: 20 }}>{turno.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '500' }}>{(a as any).profiles?.full_name}</Text>
                    <Text style={{ color: '#71717a', fontSize: 12 }}>
                      {(a as any).carrinhos?.nome} · {(a as any).locais?.nome}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: status.bg, borderWidth: 1, borderColor: status.border, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: status.text, fontSize: 11, fontWeight: '500' }}>{status.label}</Text>
                  </View>
                </View>
              )
            })
          )}
        </View>

        {/* Pendentes */}
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#e4e4e7', marginBottom: 12 }}>
            ⏳ Pendentes {pendentes.length > 0 && `(${pendentes.length})`}
          </Text>
          {pendentes.length === 0 ? (
            <Vazio texto="Nenhuma solicitacao pendente. ✅" />
          ) : (
            pendentes.map(a => {
              const turno = TURNOS[a.turno]
              return (
                <View key={a.id} style={{
                  backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a',
                  borderRadius: 16, padding: 16, marginBottom: 12,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>{(a as any).profiles?.full_name}</Text>
                      <Text style={{ color: '#71717a', fontSize: 12 }}>{(a as any).profiles?.email}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#f59e0b', fontWeight: '600' }}>
                        {format(parseISO(a.data), 'dd/MM/yyyy')}
                      </Text>
                      <Text style={{ color: '#71717a', fontSize: 12 }}>
                        {turno.emoji} {turno.label}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <Tag texto={`🛒 ${(a as any).carrinhos?.nome}`} />
                    <Tag texto={`📍 ${(a as any).locais?.nome}`} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleAprovar(a.id)}
                      style={{ flex: 1, backgroundColor: '#166534', borderRadius: 12, padding: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#4ade80', fontWeight: '600' }}>✓ Aprovar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRecusar(a.id)}
                      style={{ flex: 1, backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#991b1b', borderRadius: 12, padding: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#f87171', fontWeight: '600' }}>✕ Recusar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </View>
    </ScrollView>
  )
}

function StatCard({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 14, padding: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: cor }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{label}</Text>
    </View>
  )
}

function Tag({ texto }: { texto: string }) {
  return (
    <View style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: '#d4d4d8', fontSize: 12 }}>{texto}</Text>
    </View>
  )
}

function Vazio({ texto }: { texto: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 32, alignItems: 'center' }}>
      <Text style={{ color: '#71717a', fontSize: 13 }}>{texto}</Text>
    </View>
  )
}