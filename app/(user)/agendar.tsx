import { useNotifications } from '@/hooks/useNotifications'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { Agendamento, Carrinho, Local, Turno } from '@/types'
import { STATUS_CONFIG, TURNOS } from '@/types'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

export default function AgendarScreen() {
  const router = useRouter()
  const { profile, reset } = useAuthStore()
  useNotifications(profile?.id)

  const [carrinhos, setCarrinhos] = useState<Carrinho[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [meusAgendamentos, setMeusAgendamentos] = useState<Agendamento[]>([])
  const [ocupados, setOcupados] = useState<string[]>([])

  // Form state
  const [data, setData] = useState('')
  const [turno, setTurno] = useState<Turno | null>(null)
  const [carrinhoId, setCarrinhoId] = useState('')
  const [localId, setLocalId] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [mostrarLocais, setMostrarLocais] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('carrinhos').select('*').eq('is_active', true).order('nome'),
      supabase.from('locais').select('*').eq('is_active', true).order('nome'),
      supabase.from('agendamentos')
        .select('*, carrinhos(nome), locais(nome)')
        .eq('usuario_id', profile!.id)
        .order('data', { ascending: false })
        .limit(10) as any,
    ]).then(([{ data: c }, { data: l }, { data: a }]) => {
      setCarrinhos(c ?? [])
      setLocais(l ?? [])
      setMeusAgendamentos(a ?? [])
    })
  }, [sucesso])

  // Buscar ocupados quando data/turno mudar
  useEffect(() => {
    if (!data || !turno) return
    supabase
      .from('agendamentos')
      .select('carrinho_id')
      .eq('data', data)
      .eq('turno', turno)
      .in('status', ['pendente', 'aprovado'])
      .then(({ data: d }) => {
        setOcupados((d ?? []).map((a: any) => a.carrinho_id))
      })
  }, [data, turno])

  const handleAgendar = async () => {
    if (!data || !turno || !carrinhoId || !localId) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.')
      return
    }

    if (ocupados.includes(carrinhoId)) {
      Alert.alert('Conflito', 'Este carrinho já está ocupado neste turno.')
      return
    }

    setLoading(true)

    const { error } = await (supabase as any).from('agendamentos').insert({
      usuario_id: profile!.id,
      carrinho_id: carrinhoId,
      local_id: localId,
      data,
      turno,
      observacao: observacao || null,
      status: 'pendente',
    })

    setLoading(false)

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Conflito', 'Este carrinho foi reservado agora por outra pessoa.')
      } else {
        Alert.alert('Erro', 'Nao foi possivel agendar. Tente novamente.')
      }
      return
    }

    setSucesso(true)
    setData('')
    setTurno(null)
    setCarrinhoId('')
    setLocalId('')
    setObservacao('')
    setTimeout(() => setSucesso(false), 3000)
  }

  const handleCancelar = async (id: string, dataAg: string, turnoAg: Turno) => {
    const { data: pode } = await (supabase as any)
      .rpc('pode_cancelar', { p_data: dataAg, p_turno: turnoAg })

    if (!pode) {
      Alert.alert('Prazo encerrado', 'Nao e possivel cancelar com menos de 1 hora de antecedencia.')
      return
    }

    Alert.alert('Cancelar', 'Confirma cancelar este agendamento?', [
      { text: 'Nao', style: 'cancel' },
      {
        text: 'Sim, cancelar', style: 'destructive',
        onPress: async () => {
          await (supabase as any).from('agendamentos').update({ status: 'cancelado' }).eq('id', id)
          setMeusAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a))
        }
      }
    ])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    reset()
    router.replace('/login')
  }

  const localSelecionado = locais.find(l => l.id === localId)

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#09090b' }} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={{ padding: 20, paddingTop: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>🛒</Text>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>Agendar</Text>
            <Text style={{ fontSize: 12, color: '#71717a' }}>Ola, {profile?.full_name?.split(' ')[0]}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: '#71717a', fontSize: 13 }}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16, gap: 20 }}>

        {/* Formulário */}
        <View style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 20, padding: 20, gap: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#e4e4e7' }}>Nova solicitacao</Text>

          {sucesso && (
            <View style={{ backgroundColor: '#052e16', borderWidth: 1, borderColor: '#166534', borderRadius: 12, padding: 12 }}>
              <Text style={{ color: '#4ade80', fontSize: 13 }}>✅ Solicitacao enviada! Aguarde aprovacao.</Text>
            </View>
          )}

          {/* Data */}
          <Campo label="Data">
            <TextInput
              value={data}
              onChangeText={setData}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#52525b"
              style={inputStyle}
            />
          </Campo>

          {/* Turno */}
          <Campo label="Turno">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.entries(TURNOS) as [Turno, any][]).map(([key, t]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTurno(key)}
                  style={{
                    flex: 1, padding: 12, borderRadius: 14,
                    borderWidth: 1,
                    backgroundColor: turno === key ? '#451a03' : '#27272a',
                    borderColor: turno === key ? '#f59e0b' : '#3f3f46',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                  <Text style={{ color: turno === key ? '#f59e0b' : '#a1a1aa', fontSize: 11, fontWeight: '500', marginTop: 2 }}>{t.label}</Text>
                  <Text style={{ color: '#71717a', fontSize: 10 }}>{t.inicio}–{t.fim}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Campo>

          {/* Carrinho */}
          <Campo label="Carrinho">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {carrinhos.map(c => {
                const ocupado = ocupados.includes(c.id)
                const selecionado = carrinhoId === c.id
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => !ocupado && setCarrinhoId(c.id)}
                    disabled={ocupado}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                      borderWidth: 1,
                      backgroundColor: ocupado ? '#450a0a' : selecionado ? '#451a03' : '#27272a',
                      borderColor: ocupado ? '#991b1b' : selecionado ? '#f59e0b' : '#3f3f46',
                      opacity: ocupado ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: ocupado ? '#f87171' : selecionado ? '#f59e0b' : '#d4d4d8', fontSize: 13, fontWeight: '500' }}>
                      🛒 {c.nome}{ocupado ? ' (Ocupado)' : ''}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Campo>

          {/* Local */}
          <Campo label="Local de instalacao">
            <TouchableOpacity
              onPress={() => setMostrarLocais(true)}
              style={{ ...inputStyle as any, justifyContent: 'center' }}
            >
              <Text style={{ color: localSelecionado ? '#fff' : '#52525b', fontSize: 14 }}>
                {localSelecionado ? `📍 ${localSelecionado.nome}` : 'Selecione um local'}
              </Text>
            </TouchableOpacity>
          </Campo>

          {/* Observação */}
          <Campo label="Observacao (opcional)">
            <TextInput
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Descreva o objetivo do uso..."
              placeholderTextColor="#52525b"
              multiline
              numberOfLines={2}
              style={{ ...inputStyle as any, textAlignVertical: 'top', minHeight: 60 }}
            />
          </Campo>

          <TouchableOpacity
            onPress={handleAgendar}
            disabled={loading}
            style={{ backgroundColor: loading ? '#78350f' : '#f59e0b', borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={{ color: '#000', fontWeight: '600', fontSize: 15 }}>Solicitar agendamento</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Meus agendamentos */}
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#e4e4e7', marginBottom: 12 }}>
            Meus agendamentos
          </Text>
          {meusAgendamentos.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#71717a', fontSize: 13 }}>Nenhum agendamento ainda.</Text>
            </View>
          ) : (
            meusAgendamentos.map(a => {
              const turnoInfo = TURNOS[a.turno]
              const statusInfo = STATUS_CONFIG[a.status]
              return (
                <View key={a.id} style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '500' }}>
                        {format(parseISO(a.data), 'dd/MM/yyyy')}
                      </Text>
                      <Text style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>
                        {turnoInfo.emoji} {turnoInfo.label} · {(a as any).carrinhos?.nome} · {(a as any).locais?.nome}
                      </Text>
                      {a.obs_admin && (
                        <Text style={{ color: '#a1a1aa', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                          Admin: {a.obs_admin}
                        </Text>
                      )}
                    </View>
                    <View style={{ backgroundColor: statusInfo.bg, borderWidth: 1, borderColor: statusInfo.border, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                      <Text style={{ color: statusInfo.text, fontSize: 11, fontWeight: '500' }}>{statusInfo.label}</Text>
                    </View>
                  </View>
                  {a.status === 'pendente' && (
                    <TouchableOpacity
                      onPress={() => handleCancelar(a.id, a.data, a.turno)}
                      style={{ marginTop: 8 }}
                    >
                      <Text style={{ color: '#ef4444', fontSize: 12 }}>Cancelar solicitacao</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            })
          )}
        </View>
      </View>

      {/* Modal de seleção de local */}
      <Modal visible={mostrarLocais} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 16 }}>Selecione o local</Text>
            {locais.map(l => (
              <TouchableOpacity
                key={l.id}
                onPress={() => { setLocalId(l.id); setMostrarLocais(false) }}
                style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: localId === l.id ? '#f59e0b' : '#27272a', backgroundColor: localId === l.id ? '#451a03' : 'transparent', marginBottom: 8 }}
              >
                <Text style={{ color: localId === l.id ? '#f59e0b' : '#d4d4d8', fontWeight: '500' }}>📍 {l.nome}</Text>
                {l.descricao && <Text style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>{l.descricao}</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setMostrarLocais(false)} style={{ padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#71717a' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#d4d4d8' }}>{label}</Text>
      {children}
    </View>
  )
}

const inputStyle = {
  backgroundColor: '#27272a',
  borderWidth: 1,
  borderColor: '#3f3f46',
  borderRadius: 12,
  padding: 12,
  color: '#fff',
  fontSize: 14,
}