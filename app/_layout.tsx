import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

export default function RootLayout() {
  const { setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // Verificar sessão ao iniciar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(data as any)
      }
      setLoading(false)
    })

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          reset()
        } else if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(data as any)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <StatusBar style="light" backgroundColor="#09090b" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(user)" />
      </Stack>
    </>
  )
}