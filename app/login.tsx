import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native'

export default function LoginScreen() {
  const router = useRouter()
  const { setProfile } = useAuthStore()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email || !senha) {
      setErro('Preencha e-mail e senha')
      return
    }

    setLoading(true)
    setErro(null)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })

    if (error) {
      setErro('E-mail ou senha incorretos')
      setLoading(false)
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    const profile = profileData as any

    if (!profile) {
      setErro('Perfil nao encontrado')
      setLoading(false)
      return
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      setErro('Sua conta foi desativada. Contate o administrador.')
      setLoading(false)
      return
    }

    // Notificar admin sobre login
    await (supabase as any).from('notificacoes').insert({
      tipo: 'login',
      titulo: 'Usuario entrou no sistema',
      mensagem: `${profile.full_name} (${profile.email}) fez login agora.`,
      usuario_id: profile.id,
    })

    setProfile(profile)
    setLoading(false)

    if (profile.role === 'admin') {
      router.replace('/(admin)/dashboard')
    } else {
      router.replace('/(user)/agendar')
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 16,
            backgroundColor: '#f59e0b',
            justifyContent: 'center', alignItems: 'center',
            marginBottom: 12,
          }}>
            <Text style={{ fontSize: 32 }}>🛒</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>
            Cartinho
          </Text>
          <Text style={{ fontSize: 14, color: '#71717a', marginTop: 4 }}>
            Sistema de Agendamento
          </Text>
        </View>

        {/* Card do formulário */}
        <View style={{
          backgroundColor: '#18181b',
          borderWidth: 1,
          borderColor: '#27272a',
          borderRadius: 20,
          padding: 24,
          gap: 16,
        }}>
          {erro && (
            <View style={{
              backgroundColor: '#450a0a',
              borderWidth: 1,
              borderColor: '#991b1b',
              borderRadius: 12,
              padding: 12,
            }}>
              <Text style={{ color: '#f87171', fontSize: 13 }}>{erro}</Text>
            </View>
          )}

          {/* Email */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#d4d4d8' }}>
              E-mail
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#52525b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: '#27272a',
                borderWidth: 1,
                borderColor: '#3f3f46',
                borderRadius: 12,
                padding: 12,
                color: '#fff',
                fontSize: 14,
              }}
            />
          </View>

          {/* Senha */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#d4d4d8' }}>
              Senha
            </Text>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry
              style={{
                backgroundColor: '#27272a',
                borderWidth: 1,
                borderColor: '#3f3f46',
                borderRadius: 12,
                padding: 12,
                color: '#fff',
                fontSize: 14,
              }}
            />
          </View>

          {/* Botão */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#78350f' : '#f59e0b',
              borderRadius: 12,
              padding: 14,
              alignItems: 'center',
              marginTop: 4,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={{ color: '#000', fontWeight: '600', fontSize: 14 }}>
                Entrar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', color: '#52525b', fontSize: 12, marginTop: 24 }}>
          Nao tem acesso? Solicite ao administrador.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}