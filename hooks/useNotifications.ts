import { supabase } from '@/lib/supabase'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

// Configurar como as notificações aparecem quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function useNotifications(userId: string | undefined) {
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    if (!userId) return

    registrarPush(userId)

    // Escutar notificações recebidas com app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notificacao recebida:', notification)
      }
    )

    // Escutar clique na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notificacao clicada:', response)
      }
    )

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [userId])
}

async function registrarPush(userId: string) {
  if (!Device.isDevice) return

  // Pedir permissão
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  // Configurar canal no Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Cartinho',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
    })
  }

  // Obter token do Expo
  const tokenData = await Notifications.getExpoPushTokenAsync()
  const token = tokenData.data

  // Salvar token no banco
  await (supabase as any).from('push_tokens').upsert({
    user_id: userId,
    token,
    platform: Platform.OS,
  }, { onConflict: 'user_id' })
}