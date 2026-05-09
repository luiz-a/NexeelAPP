import { supabase } from '@/lib/supabase'
import type { Carrinho, Local } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

type Aba = 'carrinhos' | 'locais'

export default function RecursosScreen() {
  const [aba, setAba] = useState<Aba>('carrinhos')
  const [carrinhos, setCarrinhos] = useState<Carrinho[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Form
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    const [{ data: c }, { data: l }] = await Promise.all([
      (supabase as any).from('carrinhos').select('*').order('nome'),
      (supabase as any).from('locais').select('*').order('nome'),
    ])
    setCarrinhos(c ?? [])
    setLocais(l ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await carregar()
    setRefreshing(false)
  }, [])

  const handleCriar = async () => {
    if (!nome.trim()) { Alert.alert('Erro', 'Nome obrigatorio'); return }
    setSalvando(true)

    const tabela = aba === 'carrinhos' ? 'carrinhos' : 'locais'
    const payload: any = { nome: nome.trim(), is_active: true }
    if (aba === 'locais' && descricao.trim()) payload.descricao = descricao.trim()

    const { data, error } = await (supabase as any).from(tabela).insert(payload).select().single()

    setSalvando(false)

    if (error) { Alert.alert('Erro', 'Nao foi possivel criar. Tente novamente.'); return }

    if (aba === 'carrinhos') setCarrinhos(prev => [...prev, data])
    else setLocais(prev => [...prev, data])

    setNome('')
    setDescricao('')
    setMostrarForm(false)
  }

  const handleToggle = async (id: string, ativo: boolean) => {
    const tabela = aba === 'carrinhos' ? 'carrinhos' : 'locais'
    const acao = ativo ? 'desativar' : 'ativar'

    Alert.alert(acao.charAt(0).toUpperCase() + acao.slice(1), `Confirma ${acao}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: acao.charAt(0).toUpperCase() + acao.slice(1),
        onPress: async () => {
          await (supabase as any).from(tabela).update({ is_active: !ativo }).eq('id', id)
          if (aba === 'carrinhos') {
            setCarrinhos(prev => prev.map(c => c.id === id ? { ...c, is_active: !ativo } : c))
          } else {
            setLocais(prev => prev.map(l => l.id === id ? { ...l, is_active: !ativo } : l))
          }
        }
      }
    ])
  }

  const itens = aba === 'carrinhos' ? carrinhos : locais

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
      <View style={{ padding: 20, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>⚙️ Recursos</Text>
        <TouchableOpacity
          onPress={() => setMostrarForm(true)}
          style={{ backgroundColor: '#f59e0b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <Text style={{ color: '#000', fontWeight: '600', fontSize: 13 }}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        {/* Abas */}
        <View style={{ flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 14, padding: 4 }}>
          {(['carrinhos', 'locais'] as Aba[]).map(a => (
            <TouchableOpacity
              key={a}
              onPress={() => setAba(a)}
              style={{ flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: aba === a ? '#f59e0b' : 'transparent' }}
            >
              <Text style={{ color: aba === a ? '#000' : '#71717a', fontWeight: '600', fontSize: 14 }}>
                {a === 'carrinhos' ? '🛒 Carrinhos' : '📍 Locais'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        <View style={{ gap: 8, paddingBottom: 32 }}>
          {itens.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 32, alignItems: 'center' }}>
              <Text style={{ color: '#71717a' }}>Nenhum {aba === 'carrinhos' ? 'carrinho' : 'local'} cadastrado.</Text>
            </View>
          ) : itens.map(item => (
            <View key={item.id} style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 20 }}>{aba === 'carrinhos' ? '🛒' : '📍'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '500' }}>{item.nome}</Text>
                {(item as Local).descricao && (
                  <Text style={{ color: '#71717a', fontSize: 12, marginTop: 1 }}>{(item as Local).descricao}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1,
                  backgroundColor: item.is_active ? '#052e16' : '#18181b',
                  borderColor: item.is_active ? '#166534' : '#3f3f46',
                }}>
                  <Text style={{ color: item.is_active ? '#4ade80' : '#71717a', fontSize: 11, fontWeight: '500' }}>
                    {item.is_active ? 'Ativo' : 'Inativo'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleToggle(item.id, item.is_active)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
                    backgroundColor: item.is_active ? '#450a0a' : '#052e16',
                    borderColor: item.is_active ? '#991b1b' : '#166534',
                  }}
                >
                  <Text style={{ color: item.is_active ? '#f87171' : '#4ade80', fontSize: 11, fontWeight: '500' }}>
                    {item.is_active ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Modal criar */}
      <Modal visible={mostrarForm} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>
              {aba === 'carrinhos' ? 'Novo carrinho' : 'Novo local'}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#d4d4d8' }}>Nome</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder={aba === 'carrinhos' ? 'Ex: Carrinho 4' : 'Ex: Bloco B'}
                placeholderTextColor="#52525b"
                style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14 }}
              />
            </View>

            {aba === 'locais' && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#d4d4d8' }}>Descricao (opcional)</Text>
                <TextInput
                  value={descricao}
                  onChangeText={setDescricao}
                  placeholder="Ex: Corredor principal"
                  placeholderTextColor="#52525b"
                  style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14 }}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handleCriar}
                disabled={salvando}
                style={{ flex: 1, backgroundColor: '#f59e0b', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontWeight: '600' }}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setMostrarForm(false); setNome(''); setDescricao('') }}
                style={{ flex: 1, backgroundColor: '#27272a', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#a1a1aa', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}