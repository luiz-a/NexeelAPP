import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  const router = useRouter()
  const { profile, isLoading } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    if (!profile) {
      router.replace('/login')
    } else if (profile.role === 'admin') {
      router.replace('/(admin)/dashboard')
    } else {
      router.replace('/(user)/agendar')
    }
  }, [profile, isLoading])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
      <ActivityIndicator size="large" color="#f59e0b" />
    </View>
  )
}