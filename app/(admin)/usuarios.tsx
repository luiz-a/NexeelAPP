import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Form
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = async () => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
    setUsuarios(data ?? [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await carregar()
    setRefreshing(false)
  }, [])

  const handleCriar = async () => {
    if (!nome || !email || !senha) { setErro('Preencha todos os campos'); return }
    if (senha.length < 8) { setErro('Senha precisa ter pelo menos 8 caracteres'); return }

    setSalvando(true)
    setErro(null)

    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/criar-usuario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password: senha, full_name: nome }),
    })

    // Fallback: usar API do site se tiver
    if (!res.ok) {
      // Criar direto via Supabase admin (requer service role no cliente — não recomendado em prod)
      // Por ora mostrar instrução
      setErro('Use o painel web para criar usuarios. Acesse: seu-site.vercel.app/usuarios')
      setSalvando(false)
      return
    }

    const json = await res.json()
    if (json.usuario) {
      setUsuarios(prev => [json.usuario, ...prev])
      setNome('')
      setEmail('')
      setSenha('')
      setMostrarForm(false)
      Alert.alert('Sucesso', `Usuario ${nome} criado com sucesso!`)
    }

    setSalvando(false)
  }

  const handleToggle = async (id: string, ativo: boolean) => {
    const acao = ativo ? 'desativar' : 'ativar'
    Alert.alert(acao.charAt(0).toUpperCase() + acao.slice(1), `Confirma ${acao} este usuario?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: acao.charAt(0).toUpperCase() + acao.slice(1),
        onPress: async () => {
          await (supabase as any).from('profiles').update({ is_active: !ativo }).eq('id', id)
          setUsuarios(prev => prev.map(u => u.id === id ? { ...u, is_active: !ativo } : u))
        }
      }
    ])
  }

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
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>👥 Usuarios</Text>
          <Text style={{ color: '#71717a', fontSize: 13, marginTop: 2 }}>{usuarios.length} cadastrados</Text>
        </View>
        <TouchableOpacity
          onPress={() => setMostrarForm(true)}
          style={{ backgroundColor: '#f59e0b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <Text style={{ color: '#000', fontWeight: '600', fontSize: 13 }}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 8, paddingBottom: 32 }}>
        {usuarios.map(u => (
          <View key={u.id} style={{ backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#451a03', borderWidth: 1, borderColor: '#92400e', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 16 }}>
                {u.full_name[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '500' }}>{u.full_name}</Text>
              <Text style={{ color: '#71717a', fontSize: 12 }}>{u.email}</Text>
              <Text style={{ color: '#52525b', fontSize: 11, marginTop: 1 }}>
                Desde {format(parseISO(u.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleToggle(u.id, u.is_active)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
                backgroundColor: u.is_active ? '#450a0a' : '#052e16',
                borderColor: u.is_active ? '#991b1b' : '#166534',
              }}
            >
              <Text style={{ color: u.is_active ? '#f87171' : '#4ade80', fontSize: 12, fontWeight: '500' }}>
                {u.is_active ? 'Desativar' : 'Ativar'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Modal criar usuário */}
      <Modal visible={mostrarForm} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>Novo usuario</Text>

            {erro && (
              <View style={{ backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#991b1b', borderRadius: 12, padding: 12 }}>
                <Text style={{ color: '#f87171', fontSize: 13 }}>{erro}</Text>
              </View>
            )}

            {[
              { label: 'Nome completo', value: nome, set: setNome, placeholder: 'Joao Silva' },
              { label: 'E-mail', value: email, set: setEmail, placeholder: 'joao@email.com' },
              { label: 'Senha (min. 8 caracteres)', value: senha, set: setSenha, placeholder: '••••••••', secure: true },
            ].map(campo => (
              <View key={campo.label} style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#d4d4d8' }}>{campo.label}</Text>
                <TextInput
                  value={campo.value}
                  onChangeText={campo.set}
                  placeholder={campo.placeholder}
                  placeholderTextColor="#52525b"
                  secureTextEntry={campo.secure}
                  autoCapitalize="none"
                  style={{ backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14 }}
                />
              </View>
            ))}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={handleCriar}
                disabled={salvando}
                style={{ flex: 1, backgroundColor: '#f59e0b', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontWeight: '600' }}>{salvando ? 'Criando...' : 'Criar usuario'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setMostrarForm(false); setErro(null); setNome(''); setEmail(''); setSenha('') }}
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